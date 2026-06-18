export interface FAQItem {
  question: string;
  answer: string;
}

export interface PlaceToVisit {
  name: string;
  description: string;
  category: 'food' | 'exchange' | 'shop';
}

export const FAQ_DATA: FAQItem[] = [
  {
    question: 'Официальная регистрация (Белый картон)',
    answer:
      'Вам не нужно никуда ходить. Хостел берет на себя официальную регистрацию всех гостей в полицейской и туристической системе Боснии и Герцеговины в течение 24 часов с момента вашего заезда.',
  },
];

export const GUIDE_DATA: PlaceToVisit[] = [
  {
    name: 'Ćevabdžinica Željo',
    description: 'Лучшие традиционные чевапи в самом сердце Башчаршии. Обязательно к посещению.',
    category: 'food',
  },
  {
    name: 'Обменник Exclusive Change',
    description: 'Честный курс KM (конвертируемая марка) без скрытых комиссий рядом с центром.',
    category: 'exchange',
  },
];
