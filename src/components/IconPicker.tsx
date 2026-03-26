import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Clock, Search, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAirtableIcons } from '@/hooks/useAirtableIcons';
import { ICON_CATEGORIES, isImageIcon } from '@/types/routine';
import { useRoutineStore } from '@/stores/routineStore';

// Map category names to i18n keys
const CATEGORY_I18N_MAP: Record<string, string> = {
  'Manhã': 'iconCategories.morning',
  'Tarde/Noite': 'iconCategories.afternoonNight',
  'Saúde': 'iconCategories.health',
  'Aprender': 'iconCategories.learn',
  'Trabalho': 'iconCategories.work',
  'Profissões': 'iconCategories.professions',
  'Família': 'iconCategories.family',
  'Bebê/Criança': 'iconCategories.babyChild',
  'Beleza': 'iconCategories.beauty',
  'Culinária': 'iconCategories.cooking',
  'Tarefas da Casa': 'iconCategories.houseTasks',
  'Veículos': 'iconCategories.vehicles',
  'Exercício': 'iconCategories.exercise',
  'Lazer': 'iconCategories.leisure',
  'Lanches/Bebidas': 'iconCategories.snacksDrinks',
  'Pets': 'iconCategories.pets',
  'Eletrônicos': 'iconCategories.electronics',
  'Comércio': 'iconCategories.commerce',
  'Música': 'iconCategories.music',
  'Religião': 'iconCategories.religion',
};

// Localized search keyword map: translated term -> Portuguese filename keywords
const SEARCH_TRANSLATIONS: Record<string, string[]> = {
  // English
  'bed': ['cama'], 'water': ['água', 'water'], 'sleep': ['dormir', 'cama'], 'food': ['comida', 'alimento'],
  'eat': ['comer', 'comida'], 'drink': ['beber', 'bebida'], 'bath': ['banho'], 'shower': ['chuveiro', 'banho'],
  'study': ['estudar', 'estudo'], 'work': ['trabalho', 'trabalhar'], 'exercise': ['exercício', 'treino'],
  'cook': ['cozinhar', 'culinária'], 'read': ['ler', 'leitura', 'livro'], 'walk': ['caminhar', 'caminhada'],
  'run': ['correr', 'corrida'], 'cat': ['gato'], 'dog': ['cachorro', 'cão'], 'baby': ['bebê', 'bebe'],
  'car': ['carro'], 'phone': ['celular', 'telefone'], 'music': ['música', 'musica'],
  'pray': ['rezar', 'orar'], 'teeth': ['dente', 'escova'], 'brush': ['escova', 'escovar'],
  'coffee': ['café', 'cafe'], 'breakfast': ['café da manhã', 'café'], 'lunch': ['almoço', 'almoco'],
  'dinner': ['jantar'], 'gym': ['academia', 'treino'], 'yoga': ['yoga', 'ioga'],
  'clean': ['limpar', 'limpeza'], 'wash': ['lavar'],
  // French
  'lit': ['cama'], 'eau': ['água', 'water'], 'douche': ['chuveiro', 'banho'], 'manger': ['comer'],
  'boire': ['beber'], 'dormir': ['dormir'], 'cuisine': ['culinária', 'cozinhar'], 'lire': ['ler'],
  'chat': ['gato'], 'chien': ['cachorro'], 'voiture': ['carro'], 'bébé': ['bebê'],
  // Japanese
  'ベッド': ['cama'], '水': ['água'], '食べる': ['comer'], '飲む': ['beber'], '犬': ['cachorro'], '猫': ['gato'],
  // Korean  
  '침대': ['cama'], '물': ['água'], '먹다': ['comer'], '마시다': ['beber'], '개': ['cachorro'], '고양이': ['gato'],
};

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (icon: string) => void;
  selectedIcon?: string;
}

export function IconPicker({ isOpen, onClose, onSelect, selectedIcon }: IconPickerProps) {
  const { categories: airtableCategories, isLoading } = useAirtableIcons();
  const { recentIcons, addRecentIcon } = useRoutineStore();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('Recentes');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string | null>(null);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());

  const hasAirtableData = airtableCategories.length > 0;

  const categoryNames: string[] = ['Recentes', ...(hasAirtableData
    ? ([...ICON_CATEGORIES] as string[]).filter(cat => airtableCategories.some(c => c.name === cat))
        .concat(airtableCategories.map(c => c.name).filter(name => !(ICON_CATEGORIES as readonly string[]).includes(name)))
    : [...ICON_CATEGORIES] as string[])];

  const activeAirtableCat = airtableCategories.find(c => c.name === activeCategory);

  // Clean recent icons (only valid image icons)
  const cleanRecentIcons = useMemo(() =>
    recentIcons.filter(url => url && isImageIcon(url) && !brokenUrls.has(url)),
  [recentIcons, brokenUrls]);

  const handleImageError = useCallback((url: string) => {
    setBrokenUrls(prev => new Set(prev).add(url));
  }, []);

  // Search across all icons with localized keywords
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    
    // Get Portuguese equivalents for the search term
    const ptKeywords: string[] = [query];
    Object.entries(SEARCH_TRANSLATIONS).forEach(([key, values]) => {
      if (key.toLowerCase().includes(query) || query.includes(key.toLowerCase())) {
        ptKeywords.push(...values);
      }
    });

    const results: { url: string; filename: string }[] = [];
    airtableCategories.forEach(cat => {
      cat.icons.forEach(icon => {
        if (!icon.url || brokenUrls.has(icon.url)) return;
        const filename = icon.filename.toLowerCase();
        const matches = ptKeywords.some(kw => filename.includes(kw.toLowerCase()));
        if (matches) {
          results.push(icon);
        }
      });
    });
    return results;
  }, [searchQuery, airtableCategories, brokenUrls]);

  const handleSelect = (icon: string) => {
    setTempSelected(icon);
  };

  const handleDone = () => {
    const finalIcon = tempSelected || selectedIcon;
    if (finalIcon) {
      addRecentIcon(finalIcon);
      onSelect(finalIcon);
    }
    setSearchQuery('');
    setTempSelected(null);
    onClose();
  };

  const handleCancel = () => {
    setSearchQuery('');
    setTempSelected(null);
    onClose();
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'Recentes') return t('iconCategories.recent');
    return t(CATEGORY_I18N_MAP[cat] || cat);
  };

  const currentSelected = tempSelected || selectedIcon;

  const renderIcon = (url: string, filename: string, key: string) => {
    if (brokenUrls.has(url)) return null;
    return (
      <motion.button
        key={key}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.preventDefault(); handleSelect(url); }}
        className={`aspect-square flex items-center justify-center rounded-full transition-all overflow-hidden ${
          currentSelected === url
            ? 'bg-pink-accent border-2 border-primary'
            : 'bg-muted hover:border-2 hover:border-[hsl(350,80%,80%)]'
        }`}
      >
        <img
          src={url}
          alt={filename}
          className="w-9 h-9 object-contain pointer-events-none"
          loading="lazy"
          draggable={false}
          onError={() => handleImageError(url)}
        />
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/20 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-card rounded-t-card p-5 shadow-soft max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={handleCancel} className="text-sm text-muted-foreground font-medium">
                {t('iconPicker.cancel')}
              </button>
              <h3 className="text-display text-lg">{t('iconPicker.title')}</h3>
              <button onClick={handleDone} className="text-sm text-primary font-semibold">
                {t('iconPicker.done')}
              </button>
            </div>

            {/* Selected icon preview */}
            {currentSelected && isImageIcon(currentSelected) && !brokenUrls.has(currentSelected) && (
              <div className="flex justify-center mb-3">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <img src={currentSelected} alt="" className="w-12 h-12 object-contain" onError={() => handleImageError(currentSelected)} />
                </div>
              </div>
            )}

            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('iconPicker.search')}
                className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Category tabs */}
            {!searchQuery && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                {categoryNames.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                      activeCategory === cat
                        ? 'bg-pink-accent text-foreground shadow-soft border border-[hsl(350,80%,80%)]'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {cat === 'Recentes' && <Clock className="w-3 h-3" />}
                    {getCategoryLabel(cat)}
                  </button>
                ))}
              </div>
            )}

            {/* Icons grid */}
            <div className="grid grid-cols-5 gap-3 overflow-y-auto flex-1 pb-4">
              {searchQuery && searchResults ? (
                searchResults.length > 0 ? (
                  searchResults.map((icon, i) => renderIcon(icon.url, icon.filename, `search-${i}`))
                ) : (
                  <div className="col-span-5 flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-8 h-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('iconPicker.noResults', 'Nenhum resultado')}</p>
                  </div>
                )
              ) : activeCategory === 'Recentes' ? (
                cleanRecentIcons.length > 0 ? (
                  cleanRecentIcons.map((url, i) => renderIcon(url, '', `recent-${i}`))
                ) : (
                  <div className="col-span-5 flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="w-8 h-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('iconCategories.recent')}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{t('iconPicker.chooseFromCategories', 'Escolha ícones de outras categorias')}</p>
                  </div>
                )
              ) : isLoading ? (
                <div className="col-span-5 flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : hasAirtableData && activeAirtableCat ? (
                activeAirtableCat.icons
                  .filter(icon => icon.url && !brokenUrls.has(icon.url))
                  .map((icon, i) => renderIcon(icon.url, icon.filename, `${icon.filename}-${i}`))
              ) : (
                <div className="col-span-5 flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">{t('iconPicker.noIcons', 'Nenhum ícone disponível')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
