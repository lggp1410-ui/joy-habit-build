import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Clock, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAirtableIcons } from '@/hooks/useAirtableIcons';
import { ICON_CATEGORIES, isImageIcon } from '@/types/routine';
import { useRoutineStore } from '@/stores/routineStore';
import { urlToBase64 } from '@/utils/iconBase64';

// Map category names to i18n keys
const CATEGORY_I18N_MAP: Record<string, string> = {
  'Manha': 'iconCategories.morning',
  'Tarde/Noite': 'iconCategories.afternoonNight',
  'Saude': 'iconCategories.health',
  'Aprender': 'iconCategories.learn',
  'Trabalho': 'iconCategories.work',
  'Profissoes': 'iconCategories.professions',
  'Familia': 'iconCategories.family',
  'Bebe/Crianca': 'iconCategories.babyChild',
  'Beleza': 'iconCategories.beauty',
  'Culinaria': 'iconCategories.cooking',
  'Tarefas-da-Casa': 'iconCategories.houseTasks',
  'Veiculos': 'iconCategories.vehicles',
  'Exercicios': 'iconCategories.exercise',
  'Lazer': 'iconCategories.leisure',
  'Lanches/Bebidas': 'iconCategories.snacksDrinks',
  'Pets': 'iconCategories.pets',
  'Eletronicos': 'iconCategories.electronics',
  'Comercio': 'iconCategories.commerce',
  'Musica': 'iconCategories.music',
  'Religiao': 'iconCategories.religion',
};

// Normalize: remove accents for comparison
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Expanded localized search keyword map
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
  // Portuguese contextual (Item 12)
  'batata': ['french fries', 'potato', 'batata', 'fries', 'lanche'],
  'escola': ['school', 'estudo', 'estudar', 'learn', 'caderno', 'livro'],
  'vovó': ['grandmother', 'família', 'avó', 'avô', 'family'],
  'vovo': ['grandmother', 'família', 'avó', 'avô', 'family'],
  'skincare': ['beleza', 'rosto', 'face', 'pele', 'cuidado', 'skin'],
  'pele': ['skincare', 'beleza', 'rosto', 'face', 'skin'],
  'cama': ['bed', 'dormir', 'sleep', 'cama'],
  'refeição': ['meal', 'comida', 'food', 'almoço', 'jantar', 'prato'],
  'refeicao': ['meal', 'comida', 'food', 'almoço', 'jantar', 'prato'],
  'prato': ['plate', 'comida', 'food', 'refeição', 'meal'],
  'estudo': ['study', 'estudar', 'learn', 'escola', 'livro', 'caderno'],
  'dever': ['homework', 'estudo', 'school', 'tarefa'],
  'treino': ['workout', 'exercise', 'gym', 'academia', 'treinar'],
  'academia': ['gym', 'treino', 'exercise', 'workout'],
  'banho': ['bath', 'shower', 'chuveiro', 'lavar'],
  'remédio': ['medicine', 'remedio', 'saúde', 'health', 'pill'],
  'remedio': ['medicine', 'remédio', 'saúde', 'health', 'pill'],
  'compras': ['shopping', 'comércio', 'loja', 'store'],
  'loja': ['store', 'shopping', 'comércio', 'compras'],
  'cozinhar': ['cook', 'culinária', 'kitchen', 'cozinha'],
  'cozinha': ['kitchen', 'cook', 'culinária', 'cozinhar'],
  'passear': ['walk', 'caminhar', 'caminhada', 'passeio'],
  'brincar': ['play', 'jogar', 'criança', 'baby', 'lazer'],
  'rezar': ['pray', 'oração', 'religião', 'church', 'igreja'],
  'igreja': ['church', 'rezar', 'oração', 'religião'],
  'correr': ['run', 'corrida', 'exercise', 'treino'],
  'nadar': ['swim', 'piscina', 'natação'],
  'dente': ['teeth', 'brush', 'escova', 'toothbrush'],
  'cabelo': ['hair', 'beleza', 'beauty'],
  'maquiagem': ['makeup', 'beleza', 'beauty', 'rosto'],
  'roupa': ['clothes', 'vestir', 'dress'],
  'limpar': ['clean', 'limpeza', 'casa', 'house'],
  'lavar': ['wash', 'limpar', 'roupa', 'louça'],
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
  const [isConverting, setIsConverting] = useState(false);

  const hasAirtableData = airtableCategories.length > 0;

  const categoryNames: string[] = ['Recentes', ...(hasAirtableData
    ? ([...ICON_CATEGORIES] as string[]).filter(cat => airtableCategories.some(c => normalize(c.name) === normalize(cat)))
        .concat(airtableCategories.map(c => c.name).filter(name => !(ICON_CATEGORIES as readonly string[]).some(cat => normalize(cat) === normalize(name))))
    : [...ICON_CATEGORIES] as string[])];

  const activeAirtableCat = airtableCategories.find(c => normalize(c.name) === normalize(activeCategory));

  const cleanRecentIcons = useMemo(() =>
    recentIcons.filter(url => url && isImageIcon(url) && !brokenUrls.has(url)),
  [recentIcons, brokenUrls]);

  const handleImageError = useCallback((url: string) => {
    setBrokenUrls(prev => new Set(prev).add(url));
  }, []);

  // Search across all icons with localized keywords + accent-insensitive
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const queryNorm = normalize(searchQuery);
    
    // Get Portuguese equivalents for the search term
    const ptKeywords: string[] = [queryNorm];
    Object.entries(SEARCH_TRANSLATIONS).forEach(([key, values]) => {
      const keyNorm = normalize(key);
      if (keyNorm.includes(queryNorm) || queryNorm.includes(keyNorm)) {
        ptKeywords.push(...values.map(normalize));
      }
    });

    const results: { url: string; filename: string }[] = [];
    airtableCategories.forEach(cat => {
      cat.icons.forEach(icon => {
        if (!icon.url || brokenUrls.has(icon.url)) return;
        const filenameNorm = normalize(icon.filename);
        const matches = ptKeywords.some(kw => filenameNorm.includes(kw));
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

  const handleDone = async () => {
    const finalIcon = tempSelected || selectedIcon;
    if (finalIcon) {
      setIsConverting(true);
      try {
        // Convert to Base64 before saving
        const base64Icon = await urlToBase64(finalIcon);
        addRecentIcon(base64Icon);
        onSelect(base64Icon);
      } catch {
        addRecentIcon(finalIcon);
        onSelect(finalIcon);
      }
      setIsConverting(false);
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
          className="w-11 h-11 object-contain pointer-events-none"
          style={{ imageRendering: 'auto' }}
          loading="eager"
          decoding="async"
          crossOrigin="anonymous"
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
              <button onClick={handleDone} disabled={isConverting} className="text-sm text-primary font-semibold disabled:opacity-50">
                {isConverting ? '...' : t('iconPicker.done')}
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
            <div className="grid grid-cols-5 gap-x-3 gap-y-4 overflow-y-auto flex-1 pb-4">
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
