/**
 * Simplified turn controller that follows the core turn flow specification.
 */

export class TurnController {
    constructor({ state, rollButton, endTurnButton, phaseLabel, lastRollLabel, notifier, statusChip, timerLabel, avatarElement }) {
        this.state = state;
        this.rollButton = rollButton;
        this.endTurnButton = endTurnButton;
        this.phaseLabel = phaseLabel;
        this.lastRollLabel = lastRollLabel;
        this.notifier = notifier;
        this.statusChip = statusChip;
        this.timerLabel = timerLabel;
        this.avatarElement = avatarElement;

        this.currentPhase = 'waiting';
        this.currentTurnIndex = null;
        this.hasRolledThisTurn = false;
        this.turnTimer = null;

        // Auto-roll defaults to true on mobile, false on desktop
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        this.isAutoRolling = isMobile;
        this.autoRollTimer = null;
    }

    async init() {
        this.setupUI();
        this.state?.on('change', (snapshot) => this.updateFromState(snapshot));
        this.updateUI(false, null);
        this.stopTimers(true);

        // Initial visual state
        if (this.avatarElement) {
            this.updateAvatarState();
        }
    }

    setupUI() {
        if (this.rollButton) {
            this.rollButton.addEventListener('click', () => this.handleRollDice());
        }
        if (this.endTurnButton) {
            this.endTurnButton.addEventListener('click', () => this.handleEndTurn());
        }
        if (this.avatarElement) {
            this.avatarElement.style.cursor = 'pointer';
            this.avatarElement.addEventListener('click', () => this.toggleAutoRoll());
        }
    }

    toggleAutoRoll() {
        this.isAutoRolling = !this.isAutoRolling;
        this.updateAvatarState();

        if (this.notifier) {
            const status = this.isAutoRolling ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН';
            this.notifier.show(`Авто-ход ${status}`, { type: 'info' });
        }

        // If we enabled it and it's our turn, try to roll immediately
        if (this.isAutoRolling) {
            const isMyTurn = this.state?.isMyTurn?.() || false;
            if (isMyTurn && !this.hasRolledThisTurn) {
                this.checkAutoRoll();
            }
        }
    }

    updateAvatarState() {
        if (!this.avatarElement) return;

        if (this.isAutoRolling) {
            this.avatarElement.classList.add('auto-rolling-active');
            this.avatarElement.style.border = '2px solid #32df8d'; // Success color
            this.avatarElement.style.boxShadow = '0 0 15px rgba(50, 223, 141, 0.6)';
            this.avatarElement.title = "Авто-ход включен (нажмите для выключения)";
        } else {
            this.avatarElement.classList.remove('auto-rolling-active');
            this.avatarElement.style.border = '';
            this.avatarElement.style.boxShadow = '';
            this.avatarElement.title = "Авто-ход выключен (нажмите для включения)";
        }
    }

    updateFromState(snapshot) {
        if (!snapshot) return;

        const currentPlayer = this.state?.getCurrentPlayer?.();
        const isMyTurn = this.state?.isMyTurn?.() || false;

        if (typeof snapshot.hasRolledThisTurn === 'boolean') {
            this.hasRolledThisTurn = snapshot.hasRolledThisTurn;
        }

        if (!isMyTurn) {
            this.currentPhase = 'waiting';
            this.currentTurnIndex = null;
            this.stopTimers(true);
            this.updateUI(false, currentPlayer);
            return;
        }

        if (this.currentTurnIndex !== snapshot.activeIndex) {
            this.currentTurnIndex = snapshot.activeIndex;
            this.currentPhase = 'rolling';
            this.hasRolledThisTurn = !!snapshot.hasRolledThisTurn;
            this.stopTimers(false);

            const serverSeconds = snapshot.turnTimeLeft;
            if (typeof serverSeconds === 'number' && serverSeconds >= 0) {
                this.startServerTimer(serverSeconds);
            } else {
                const fallback = snapshot.turnTime
                    || this.state?.getTurnTimeSec?.(120)
                    || 120;
                this.startTurnTimer(fallback);
            }
        }

        if (snapshot?.diceResult?.total != null && this.lastRollLabel) {
            this.lastRollLabel.textContent = snapshot.diceResult.total;
        }

        this.updateUI(isMyTurn, currentPlayer);

        // Check for auto-roll
        if (isMyTurn && !this.hasRolledThisTurn && this.isAutoRolling) {
            this.checkAutoRoll();
        }
    }

    checkAutoRoll() {
        if (this.autoRollTimer) clearTimeout(this.autoRollTimer);

        this.autoRollTimer = setTimeout(() => {
            if (this.state?.isMyTurn?.() && !this.hasRolledThisTurn && this.isAutoRolling) {
                console.log('🎲 Auto-rolling dice...');
                this.handleRollDice();
            }
        }, 1500); // 1.5s delay
    }

    async handleRollDice() {
        if (!this.state || this.hasRolledThisTurn) return;

        this.setButtonState(this.rollButton, true);

        try {
            const result = await this.state.rollDice();
            const total = result?.result?.total;
            if (typeof total === 'number' && this.lastRollLabel) {
                this.lastRollLabel.textContent = total;
            }

            this.hasRolledThisTurn = true;
            this.updateUI(true, this.state.getCurrentPlayer?.());

            if (this.notifier) {
                this.notifier.show('Кубик брошен', { type: 'info' });
            }

            // Попытка загрузить движение и анимировать
            try {
                const roomId = this.state?.roomId;
                const userId = this.state?.getUserId?.();
                if (roomId && userId && typeof total === 'number' && total > 0) {
                    const moveRes = await fetch(`/api/rooms/${roomId}/move`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                        body: JSON.stringify({ steps: total, user_id: userId })
                    });
                    const moveData = await moveRes.json().catch(() => ({}));
                    if (moveRes.ok && moveData?.state) {
                        this.state.applyState(moveData.state);
                        const path = moveData?.state?.moveResult?.path || moveData?.path || [];
                        if (Array.isArray(path) && path.length > 0 && typeof window.animateInnerMove === 'function') {
                            window.animateInnerMove(path, 500, userId);
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ Move animation fallback failed:', e);
            }
        } catch (error) {
            console.error('Ошибка броска кубика:', error);
            this.hasRolledThisTurn = false;
            this.setButtonState(this.rollButton, false);
            if (this.notifier) {
                this.notifier.show('Ошибка броска кубика', { type: 'error' });
            }
            throw error;
        } finally {
            this.updateUI(this.state?.isMyTurn?.() || false, this.state?.getCurrentPlayer?.());
        }
    }

    async handleEndTurn() {
        if (!this.state) return;
        this.setButtonState(this.endTurnButton, true);

        try {
            await this.state.endTurn();
            this.hasRolledThisTurn = false;
            this.currentPhase = 'waiting';
            this.stopTimers(true);
            if (this.notifier) {
                this.notifier.show('Ход завершен', { type: 'success' });
            }
        } catch (error) {
            console.error('Ошибка завершения хода:', error);
            if (this.notifier) {
                this.notifier.show('Ошибка завершения хода', { type: 'error' });
            }
        } finally {
            this.updateUI(this.state?.isMyTurn?.() || false, this.state?.getCurrentPlayer?.());
        }
    }

    updateUI(isMyTurn, currentPlayer) {
        if (this.phaseLabel) {
            this.phaseLabel.textContent = isMyTurn ? 'Ваш ход' : 'Ожидание хода';
        }

        this.setButtonState(this.rollButton, !isMyTurn || this.hasRolledThisTurn);
        this.setButtonState(this.endTurnButton, !isMyTurn || !this.hasRolledThisTurn);

        if (this.statusChip) {
            this.statusChip.classList.toggle('is-my-turn', isMyTurn);
        }

        if (!isMyTurn) {
            this.stopTimers(true);
        }
    }

    startTurnTimer(totalSec = 120) {
        const seconds = Math.max(0, Number(totalSec) || 0);
        this.stopTimers(false);

        let left = seconds;
        const tick = () => {
            if (this.timerLabel) {
                this.timerLabel.textContent = `${Math.max(0, left)}s`;
            }

            if (left <= 0) {
                this.stopTimers(true);
                return;
            }

            left -= 1;
            this.turnTimer = setTimeout(tick, 1000);
        };

        tick();
    }

    startServerTimer(serverTimeLeft) {
        const seconds = Math.max(0, Number(serverTimeLeft) || 0);
        this.startTurnTimer(seconds);
    }

    stopTimers(showPlaceholder = false) {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
        }
        if (showPlaceholder && this.timerLabel) {
            this.timerLabel.textContent = '---';
        }
    }

    setButtonState(button, disabled) {
        if (!button) return;
        button.disabled = !!disabled;
        if (disabled) {
            button.classList.add('is-disabled');
        } else {
            button.classList.remove('is-disabled');
        }
    }

    destroy() {
        this.stopTimers(true);
        this.hasRolledThisTurn = false;
    }
}

export default TurnController;
