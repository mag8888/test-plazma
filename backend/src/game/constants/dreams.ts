export interface DreamDefinition {
    name: string;
    cost: number;
    description?: string;
    squareIndex?: number;
}

export const DREAMS_LIST: DreamDefinition[] = [
    { name: 'Дом мечты', cost: 200000, description: 'Построить дом мечты для семьи', squareIndex: 25 },
    { name: 'Посетить Антарктиду', cost: 300000, description: 'Экспедиция к Южному полюсу.', squareIndex: 29 },
    { name: 'Высочайшие вершины', cost: 800000, description: 'Подняться на все высочайшие вершины мира', squareIndex: 37 },
    { name: 'Автор бестселлера', cost: 600000, description: 'Стать автором книги-бестселлера', squareIndex: 39 },
    { name: 'Яхта в Средиземном', cost: 1000000, description: 'Жить год на яхте в Средиземном море', squareIndex: 43 },
    { name: 'Мировой фестиваль', cost: 500000, description: 'Организовать мировой фестиваль', squareIndex: 45 },
    { name: 'Фонд талантов', cost: 1500000, description: 'Создать фонд поддержки талантов', squareIndex: 49 },
    { name: 'Кругосветка', cost: 400000, description: 'Кругосветное плавание на паруснике', squareIndex: 51 },
    { name: 'Кругосветка (Люкс)', cost: 800000, description: 'Кругосветное плавание на паруснике (Premium)', squareIndex: 53 },
    { name: 'Частный самолёт', cost: 5000000, description: 'Купить частный самолёт', squareIndex: 55 },
    { name: 'Коллекция суперкаров', cost: 3000000, description: 'Гараж с редкими автомобилями.', squareIndex: 59 },
    { name: 'Снять фильм', cost: 2000000, description: 'Снять полнометражный фильм', squareIndex: 61 },
    { name: 'Лидер мнений', cost: 4000000, description: 'Стать мировым лидером мнений', squareIndex: 63 },
    { name: 'Белоснежная Яхта', cost: 2500000, description: 'Роскошная яхта для путешествий.', squareIndex: 65 },
    { name: 'Полёт в космос', cost: 1000000, description: 'Туристический полет на орбиту.', squareIndex: 67 },
    { name: 'Благотворительный фонд', cost: 10000000, description: 'Организовать благотворительный фонд', squareIndex: 69 }
];
