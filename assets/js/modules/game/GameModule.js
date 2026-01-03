import GameState from './GameState.js';
import NotificationCenter from './NotificationCenter.js';
import PlayersPanel from './PlayersPanel.js';
import TurnController from './TurnController.js';
import GameFlowController from './GameFlowController.js';
import DealController from './DealController.js';
import AssetsManager from './AssetsManager.js';
import PlayerSummary from './PlayerSummary.js';

class GameModule {
    constructor({ roomId }) {
        this.roomId = roomId;
        this.state = new GameState({ roomId });
        this.notifier = new NotificationCenter(document.getElementById('gameToast'));
        this.modules = [];
        this.gameFlow = null;
    }

    async init() {
        this.setupModules();
        this.setupListeners();
        this.setupUiShortcuts();
        try {
            await this.state.init();
            // Делаем GameState доступным глобально для обновления фишек
            window.gameState = this.state;
        } catch (error) {
            this.notifier.show(error.message || 'Не удалось загрузить игру', { type: 'error' });
        }
    }

    setupModules() {
        const playersPanel = new PlayersPanel({
            state: this.state,
            container: document.getElementById('playersPanelList')
        });
        playersPanel.init();
        this.modules.push(playersPanel);

        // Инициализируем игровой поток и адаптеры поверх GameState/RoomApi
        this.gameFlow = new GameFlowController({
            eventBus: this.state, // GameState наследует EventEmitter
            getModule: (name) => {
                if (name === 'diceModule') {
                    return {
                        roll: async () => {
                            const res = await this.state.rollDice();
                            const values = [res?.result?.dice1 || 0, res?.result?.dice2 || 0].filter(Boolean);
                            const total = res?.result?.total || values.reduce((a, b) => a + b, 0) || 0;
                            return { values, total };
                        }
                    };
                }
                if (name === 'movementModule') {
                    return {
                        movePlayer: async (playerId, steps) => {
                            // Клиентского движения нет — возвращаем целевую позицию как текущую
                            // Серверная логика может расшириться позже
                            const snapshot = this.state.getSnapshot();
                            return { from: 0, to: (snapshot?.currentTurn || 1), steps, cell: null };
                        }
                    };
                }
                if (name === 'eventModule') {
                    return {
                        queueEvent: async (evt) => {
                            // Простейшая обработка: если это выбор сделки, открыть модал через DealController
                            return { handled: true, type: evt.type };
                        }
                    };
                }
                return null;
            }
        });
        this.gameFlow.init?.();

        const turnController = new TurnController({
            state: this.state,
            rollButton: document.getElementById('rollDiceBtn'),
            endTurnButton: document.getElementById('endTurnBtn'),
            phaseLabel: document.getElementById('turnState'),
            lastRollLabel: document.getElementById('lastRollValue'),
            notifier: this.notifier,
            statusChip: document.getElementById('turnStatusChip'),
            timerLabel: document.getElementById('turnTimerValue'),
            avatarElement: document.getElementById('user-avatar')
        });
        turnController.init();
        this.modules.push(turnController);

        const dealController = new DealController({
            state: this.state,
            modalElement: document.getElementById('dealModal'),
            notifier: this.notifier
        });
        dealController.init();
        this.modules.push(dealController);

        const assetsManager = new AssetsManager({
            state: this.state,
            container: document.getElementById('assetsList'),
            notifier: this.notifier
        });
        assetsManager.init();
        this.modules.push(assetsManager);

        // Делаем AssetsManager доступным глобально
        window.assetsManager = assetsManager;

        const playerSummary = new PlayerSummary({ state: this.state });
        playerSummary.init();
        this.modules.push(playerSummary);

        // Инициализируем debounce для банковских запросов
        this.bankUpdateDebounce = null;
        this.lastBankUpdate = 0;
        this.BANK_UPDATE_INTERVAL = 5000; // 5 секунд между обновлениями

        // Инициализируем push-уведомления
        this.pushService = window.pushNotificationService;
        this.setupPushNotifications();

        // Обновляем баланс только при критических изменениях (не при каждом изменении состояния)
        this.state.on('change', async () => {
            try {
                const user = this.state.api?.getCurrentUser?.();
                const roomId = this.roomId;
                if (!user?.username || !roomId) return;

                // Проверяем, нужно ли обновлять банковские данные
                const snapshot = this.state.getSnapshot();
                const shouldUpdateBank = this.shouldUpdateBankData(snapshot);

                if (shouldUpdateBank && window.dataStore && window.dataStoreAdapter) {
                    // Debounce банковских запросов - обновляем максимум раз в 5 секунд
                    this.debouncedBankUpdate(user.username, roomId);
                }
            } catch (error) {
                console.error('❌ GameModule: Ошибка обновления банковских данных:', error);
            }
        });
    }

    setupListeners() {
        this.state.on('error', (error) => {
            this.notifier.show(error.message || 'Произошла ошибка', { type: 'error' });
        });
    }

    /**
     * Проверяет, нужно ли обновлять банковские данные
     * @param {Object} snapshot - Снимок состояния игры
     * @returns {boolean}
     */
    shouldUpdateBankData(snapshot) {
        // Обновляем только при критических изменениях:
        // 1. Смена хода (активный игрок изменился)
        // 2. Изменение состояния игры (начало/конец)
        // 3. Изменение состава игроков

        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastBankUpdate;

        // Минимальный интервал между обновлениями
        if (timeSinceLastUpdate < this.BANK_UPDATE_INTERVAL) {
            return false;
        }

        // Проверяем критические изменения
        const hasTurnChanged = this.lastActiveIndex !== snapshot.activeIndex;
        const hasGameStateChanged = this.lastGameState !== snapshot.gameState;
        const hasPlayersChanged = this.lastPlayersCount !== (snapshot.players?.length || 0);

        if (hasTurnChanged || hasGameStateChanged || hasPlayersChanged) {
            // Обновляем кэш
            this.lastActiveIndex = snapshot.activeIndex;
            this.lastGameState = snapshot.gameState;
            this.lastPlayersCount = snapshot.players?.length || 0;
            this.lastBankUpdate = currentTime;
            return true;
        }

        return false;
    }

    /**
     * Debounced обновление банковских данных
     * @param {string} username - Имя пользователя
     * @param {string} roomId - ID комнаты
     */
    debouncedBankUpdate(username, roomId) {
        // Очищаем предыдущий таймер
        if (this.bankUpdateDebounce) {
            clearTimeout(this.bankUpdateDebounce);
        }

        // Устанавливаем новый таймер
        this.bankUpdateDebounce = setTimeout(async () => {
            try {
                console.log('🔄 GameModule: Обновление банковских данных (debounced)');

                // Параллельно загружаем все данные
                const [balanceRes, creditRes, financialsRes] = await Promise.all([
                    fetch(`/api/bank/balance/${encodeURIComponent(username)}/${encodeURIComponent(roomId)}`),
                    fetch(`/api/bank/credit/status/${encodeURIComponent(username)}/${encodeURIComponent(roomId)}`),
                    fetch(`/api/bank/financials/${encodeURIComponent(username)}/${encodeURIComponent(roomId)}`)
                ]);

                const [balanceData, creditData, financialsData] = await Promise.all([
                    balanceRes.json(),
                    creditRes.json(),
                    financialsRes.json()
                ]);

                // Обновляем DataStore
                window.dataStore.update({
                    balance: Number(balanceData?.amount || 0),
                    credit: Number(creditData?.loanAmount || 0),
                    salary: Number(financialsData?.salary || 0),
                    passiveIncome: Number(financialsData?.passiveIncome || 0)
                });

                // Пересчитываем производные значения
                window.dataStore.calculateDerivedValues();

                // Обновляем UI через DataStoreAdapter
                window.dataStoreAdapter.updateUI();

                console.log('✅ GameModule: Банковские данные обновлены (debounced)');
            } catch (error) {
                console.error('❌ GameModule: Ошибка debounced обновления банковских данных:', error);
            }
        }, 1000); // 1 секунда задержки
    }

    /**
     * Настраивает push-уведомления
     */
    setupPushNotifications() {
        if (!this.pushService) return;

        // Подписываемся на критические события
        this.pushService.on('balanceChanged', (data) => {
            console.log('🔔 GameModule: Получено уведомление об изменении баланса', data);
            // Обновляем UI только при критических изменениях
            if (window.dataStoreAdapter) {
                window.dataStoreAdapter.updateUI();
            }
        });

        this.pushService.on('turnChanged', (data) => {
            console.log('🔔 GameModule: Получено уведомление о смене хода', data);
            // Принудительно обновляем банковские данные при смене хода
            const user = this.state.api?.getCurrentUser?.();
            if (user?.username && this.roomId) {
                this.debouncedBankUpdate(user.username, this.roomId);
            }
        });

        this.pushService.on('assetPurchased', (data) => {
            console.log('🔔 GameModule: Получено уведомление о покупке актива', data);
            // Обновляем UI актива
            this.updateAssetsUI(data);
        });

        this.pushService.on('transferCompleted', (data) => {
            console.log('🔔 GameModule: Получено уведомление о переводе', data);
            // Обновляем баланс после перевода
            const user = this.state.api?.getCurrentUser?.();
            if (user?.username && this.roomId) {
                this.debouncedBankUpdate(user.username, this.roomId);
            }
        });
    }

    /**
     * Обновляет UI актива после покупки
     * @param {Object} data - Данные о покупке
     */
    updateAssetsUI(data) {
        try {
            // Обновляем панель активов
            const assetsPanel = document.querySelector('.assets-panel');
            if (assetsPanel && data.asset) {
                // Добавляем новый актив в UI
                const assetElement = document.createElement('div');
                assetElement.className = 'asset-item';
                assetElement.innerHTML = `
                    <div class="asset-name">${data.asset.name}</div>
                    <div class="asset-value">$${data.asset.value?.toLocaleString() || 0}</div>
                    <div class="asset-income">+$${data.asset.income || 0}/мес</div>
                `;
                assetsPanel.appendChild(assetElement);
            }
        } catch (error) {
            console.error('❌ GameModule: Ошибка обновления UI актива:', error);
        }
    }

    setupUiShortcuts() {
        const bankBtn = document.getElementById('bankButton');
        bankBtn?.addEventListener('click', () => {
            // Закрываем предыдущее окно банка, если оно открыто
            if (window.bankWindow && !window.bankWindow.closed) {
                window.bankWindow.close();
            }

            const v = Date.now();
            const features = 'width=720,height=840,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no';
            // Открываем банковский модуль v4
            if (typeof window.openBankV4 === 'function') {
                window.openBankV4();
            } else {
                console.error('BankModuleV4 не доступен! Убедитесь, что модуль загружен.');
            }

            // Фокусируем новое окно
            if (window.bankWindow) {
                window.bankWindow.focus();
            }
        });

        const dealsBtn = document.getElementById('dealsButton');
        dealsBtn?.addEventListener('click', () => {
            const v = Date.now();
            window.open(`/game-board/deals-module.html?v=${v}`, 'dealsModule', 'width=960,height=820,scrollbars=yes');
        });

        // Клики по карточкам полоски сделок
        document.querySelectorAll('.special-card[data-deal-tab]')?.forEach(card => {
            card.addEventListener('click', () => {
                const tab = card.getAttribute('data-deal-tab');
                const v = Date.now();
                window.open(`/game-board/deals-module.html?v=${v}#${tab}`, 'dealsModule', 'width=960,height=820,scrollbars=yes');
            });
        });

        const leaveBtn = document.getElementById('leaveRoomBtn');
        leaveBtn?.addEventListener('click', () => {
            window.location.assign(`/room/${this.roomId}`);
        });

        const user = this.state.api?.getCurrentUser?.();
        if (user) {
            const nameEl = document.getElementById('username');
            const avatarEl = document.getElementById('user-avatar');
            if (nameEl) {
                nameEl.textContent = user.first_name || user.username || user.email || 'Игрок';
            }
            if (avatarEl) {
                avatarEl.textContent = (user.first_name || user.username || 'U').slice(0, 1).toUpperCase();
            }
        }

        // Обновляем счетчики карт на карточках из /api/cards
        try {
            fetch('/api/cards')
                .then(r => r.json())
                .then(data => {
                    const market = Array.isArray(data?.marketCards) ? data.marketCards.length : 0;
                    const expense = Array.isArray(data?.expenseCards) ? data.expenseCards.length : 0;
                    const small = Array.isArray(data?.smallDeals) ? data.smallDeals.length : 0;
                    const big = Array.isArray(data?.bigDeals) ? data.bigDeals.length : 0;
                    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
                    setText('marketCardCount', market);
                    setText('expenseCardCount', expense);
                    setText('smallDealCount', small);
                    setText('bigDealCount', big);
                })
                .catch(() => { });
        } catch (_) { }
    }
}

if (typeof window !== 'undefined') {
    window.GameModule = GameModule;
}

export default GameModule;
