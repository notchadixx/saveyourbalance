import React, { useState } from 'react';
import { useProfile } from '../../../context/ProfileContext';
import { Check, ShieldCheck, CreditCard, Sparkles, CalendarClock, Briefcase } from 'lucide-react';

interface Props {
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const ProfileSelectionStep: React.FC<Props> = () => {
  const { profile, setProfile } = useProfile();
  const [selected, setSelected] = useState(profile?.profileType || 'salary_advance');

  const profiles = [
    { 
      id: 'salary_advance', 
      label: 'Зарплата + аванс', 
      desc: 'Два фиксированных поступления в месяц (5 и 20 числа)',
      icon: CreditCard,
      badge: 'Популярный'
    },
    { 
      id: 'stable', 
      label: 'Стабильный оклад', 
      desc: 'Одна фиксированная выплата раз в месяц',
      icon: ShieldCheck 
    },
    { 
      id: 'variable', 
      label: 'Оклад + бонусы / KPI', 
      desc: 'Фиксированная база + переменные премии',
      icon: Sparkles 
    },
    { 
      id: 'irregular', 
      label: 'Плавающий график', 
      desc: 'Смены 2/2, гибкие даты поступлений',
      icon: CalendarClock 
    },
    { 
      id: 'freelance', 
      label: 'Свой профиль', 
      desc: 'Для самозанятых, ИП и безработных (весь доход переменный)',
      subtext: '(для самозанятых, ИП и безработных)',
      icon: Briefcase 
    },
  ];

  const handleSelect = (id: string) => {
    setSelected(id as any);
    if (profile) {
      setProfile({ ...profile, profileType: id as any });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Выберите финансовый профиль</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Алгоритмы распределения лимитов адаптируются под ваш график поступлений
        </p>
      </div>

      <div className="space-y-2.5">
        {profiles.map(p => {
          const Icon = p.icon;
          const isSelected = selected === p.id;
          return (
            <div
              key={p.id}
              className={`relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isSelected 
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 shadow-sm ring-1 ring-blue-600/30' 
                  : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-gray-300 dark:hover:border-slate-700'
              }`}
              onClick={() => handleSelect(p.id)}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                isSelected 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.label}</span>
                  {p.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {p.badge}
                    </span>
                  )}
                </div>
                {p.subtext && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block font-normal leading-tight mt-0.5">
                    {p.subtext}
                  </span>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{p.desc}</p>
              </div>

              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                isSelected 
                  ? 'border-blue-600 bg-blue-600 text-white' 
                  : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}>
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};