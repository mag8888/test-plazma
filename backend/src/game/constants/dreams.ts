export interface DreamDefinition {
    name: string;
    cost: number;
    description?: string;
}

export const DREAMS_LIST: DreamDefinition[] = [
    { name: 'Графский титул', cost: 150000, description: 'Получить гражданство и титул графа в Европе' }, // inferred cost
    { name: 'Сказочное путешествие', cost: 100000, description: 'Поехать в сказочное путешествие на двоих' },
    { name: 'Концерт на стадионе', cost: 200000, description: 'Выступить на стадионе' },
    { name: 'Электромобиль 1000лс', cost: 200000, description: 'Купить электромобиль 1000+ сил' },
    { name: 'Частный космодром', cost: 1000000, description: 'Построить свой космодром для запуска ракет' },
    { name: 'Миллион подписчиков', cost: 1000000, description: 'Набрать миллион подписчиков в соцсетях' }, // Cost seems high for just subs, but following user list
    { name: 'Крупное пожертвование', cost: 1000000, description: 'Пожертвовать $1,000,000' },
    { name: 'Компания-единорог', cost: 1000000000, description: 'Создать компанию стоимостью миллиард' },
    { name: 'Город будущего', cost: 1000000000, description: 'Построить город будущего' },
    { name: 'Мировой бренд', cost: 1000000, description: 'Создать мировой бренд' },
    { name: 'Личный небоскреб', cost: 1000000000, description: 'Построить свой небоскреб' },
    { name: 'Своя религия', cost: 10000000, description: 'Создание своей религии' },
    { name: 'Освоение планеты', cost: 10000000000, description: 'Освоение новой планеты' },
    { name: 'Сеть ресторанов', cost: 10000000, description: 'Сеть ресторанов нового времени' },
    { name: 'Мировое турне', cost: 10000000, description: 'Мировое турне "Пробуждение"' }, // Adjusted title
    { name: 'Год в Шаолине', cost: 100000, description: 'Провести год в монастыре Шаолинь' },
    { name: 'Миротворец', cost: 0, description: 'Прекратить войну в стране' }, // 0 cost implies special win or text only? Assuming 0 for now.
    { name: 'Тур по местам силы', cost: 1000000, description: 'Тур по местам силы' },
    { name: 'Золотая кнопка YouTube', cost: 100000, description: 'Получить Золотую кнопку на Ютуб' }, // Inferred cost based on branding
    { name: 'Метавселенная', cost: 5000000, description: 'Создать свою метавселенную' }, // Inferred cost
    { name: 'Друг-инопланетянин', cost: 0, description: 'Подружиться с инопланетянином' }, // Abstract
    { name: 'Огромный бриллиант', cost: 1000000, description: 'Купить огромный бриллиант' },
    { name: 'Встреча с Илоном', cost: 1000000, description: 'Личная встреча с Илоном Маском' },
    { name: 'Тайное правительство', cost: 0, description: 'Стать членом тайного правительства' },
    { name: 'Родовое поместье', cost: 1000000, description: 'Построить родовое поместье' },
    { name: 'Ранчо в горах', cost: 1000000, description: 'Ранчо в красивом месте' },
    { name: 'Виноградник в Италии', cost: 1000000, description: 'Купить виноградник в Италии' },
    { name: 'Burning Man', cost: 100000, description: 'Поездка на фестиваль Burning Man' },
    { name: 'Замок в Европе', cost: 1000000, description: 'Купить старинный замок в Европе' },
    { name: 'Карнавал в Рио', cost: 100000, description: 'Посетить карнавал в Рио' },
    { name: 'Шоу Пробуждение', cost: 1000000, description: 'Мировое турне пробуждающее шоу' },
    { name: 'Центр развития', cost: 500000, description: 'Центр развития личности человека' },
    { name: 'Галерея искусств', cost: 200000, description: 'Галерея современного искусства' },
    { name: 'Центр омоложения', cost: 500000, description: 'Центр омоложения тела' }
];
