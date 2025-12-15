import { memo } from 'react';
import { BOOK_CATEGORIES, type BookCategory } from '../../data/bookCategories';

// Import category SVGs as React components
import TorahGraphic from '../../assets/book-graphics/torah.svg?react';
import HistoricalGraphic from '../../assets/book-graphics/historical.svg?react';
import WisdomGraphic from '../../assets/book-graphics/wisdom.svg?react';
import MajorProphetsGraphic from '../../assets/book-graphics/major-prophets.svg?react';
import MinorProphetsGraphic from '../../assets/book-graphics/minor-prophets.svg?react';
import GospelsGraphic from '../../assets/book-graphics/gospels.svg?react';
import EpistlesGraphic from '../../assets/book-graphics/epistles.svg?react';
import RevelationGraphic from '../../assets/book-graphics/revelation.svg?react';

// Map categories to their SVG components
const categoryGraphics: Record<BookCategory, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'torah': TorahGraphic,
  'historical': HistoricalGraphic,
  'wisdom': WisdomGraphic,
  'major-prophets': MajorProphetsGraphic,
  'minor-prophets': MinorProphetsGraphic,
  'gospels': GospelsGraphic,
  'epistles': EpistlesGraphic,
  'revelation': RevelationGraphic,
};

interface BookGraphicProps {
  bookId: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * BookGraphic component displays a minimalist SVG graphic
 * representing the category of each Bible book.
 * These graphics appear at the beginning of each book (chapter 1).
 *
 * Categories:
 * - Torah: Tablets & Scroll (Genesis-Deuteronomy)
 * - Historical: Crown (Joshua-Esther)
 * - Wisdom: Oil Lamp (Job-Song of Solomon)
 * - Major Prophets: Large Scroll (Isaiah-Daniel)
 * - Minor Prophets: Small Scroll (Hosea-Malachi)
 * - Gospels: Cross (Matthew-John)
 * - Epistles: Quill & Letter (Acts-Jude)
 * - Revelation: Alpha & Omega
 */
export const BookGraphic = memo(function BookGraphic({
  bookId,
  className = '',
  style
}: BookGraphicProps) {
  const category = BOOK_CATEGORIES[bookId.toLowerCase()];

  if (!category) {
    return null;
  }

  const GraphicComponent = categoryGraphics[category];

  if (!GraphicComponent) {
    return null;
  }

  return (
    <div className={className} style={style} aria-hidden="true">
      <GraphicComponent
        className="w-full h-full"
        style={{ color: 'currentColor' }}
      />
    </div>
  );
});
