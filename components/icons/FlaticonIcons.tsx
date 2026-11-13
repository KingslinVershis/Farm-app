import React from 'react';

export interface FlaticonIconProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  size?: number | string;
  /** Kept optional for compatibility with icon wrappers */
  strokeWidth?: number;
}

function createFlaticonComponent(fiClassName: string): React.FC<FlaticonIconProps> {
  const IconComponent: React.FC<FlaticonIconProps> = ({
    size = 16,
    className = '',
    style,
    strokeWidth: _strokeWidth,
    ...rest
  }) => {
    const resolvedSize = typeof size === 'number' ? `${size}px` : size;
    return (
      <i
        aria-hidden="true"
        className={`fi ${fiClassName} inline-flex items-center justify-center leading-none select-none ${className}`.trim()}
        style={{ fontSize: resolvedSize, width: resolvedSize, height: resolvedSize, ...style }}
        {...rest}
      />
    );
  };
  IconComponent.displayName = `Flaticon(${fiClassName})`;
  return IconComponent;
}

export const Check = createFlaticonComponent('fi-rr-check');
export const Camera = createFlaticonComponent('fi-rr-camera');
export const Upload = createFlaticonComponent('fi-rr-upload');
export const Copy = createFlaticonComponent('fi-rr-copy');
export const ShieldCheck = createFlaticonComponent('fi-rr-shield-check');
export const ArrowLeft = createFlaticonComponent('fi-rr-arrow-left');
export const ArrowRight = createFlaticonComponent('fi-rr-arrow-right');
export const Mail = createFlaticonComponent('fi-rr-envelope');
export const Lock = createFlaticonComponent('fi-rr-lock');
export const Eye = createFlaticonComponent('fi-rr-eye');
export const EyeOff = createFlaticonComponent('fi-rr-eye-crossed');
export const KeyRound = createFlaticonComponent('fi-rr-key');
export const Clock = createFlaticonComponent('fi-rr-clock');
export const CheckCircle2 = createFlaticonComponent('fi-rr-check-circle');
export const AlertCircle = createFlaticonComponent('fi-rr-exclamation');
export const RefreshCw = createFlaticonComponent('fi-rr-refresh');
export const User = createFlaticonComponent('fi-rr-user');
export const Shield = createFlaticonComponent('fi-rr-shield');
export const Palette = createFlaticonComponent('fi-rr-palette');
export const Globe = createFlaticonComponent('fi-rr-globe');
export const Sparkles = createFlaticonComponent('fi-rr-sparkles');
export const Sun = createFlaticonComponent('fi-rr-sun');
export const Moon = createFlaticonComponent('fi-rr-moon');
export const Calendar = createFlaticonComponent('fi-rr-calendar');
export const Activity = createFlaticonComponent('fi-rr-pulse');
export const Save = createFlaticonComponent('fi-rr-disk');
export const Phone = createFlaticonComponent('fi-rr-phone-call');
export const MapPin = createFlaticonComponent('fi-rr-marker');
export const Home = createFlaticonComponent('fi-rr-home');
export const Trash2 = createFlaticonComponent('fi-rr-trash');
export const AlertTriangle = createFlaticonComponent('fi-rr-triangle-warning');
export const Droplets = createFlaticonComponent('fi-rr-raindrops');
export const Wind = createFlaticonComponent('fi-rr-wind');
export const CloudRain = createFlaticonComponent('fi-rr-cloud-rain');
export const ExternalLink = createFlaticonComponent('fi-rr-arrow-up-right-from-square');
export const Sprout = createFlaticonComponent('fi-rr-seedling');
export const Search = createFlaticonComponent('fi-rr-search');
export const FileText = createFlaticonComponent('fi-rr-document');
export const Compass = createFlaticonComponent('fi-rr-compass-alt');
export const X = createFlaticonComponent('fi-rr-cross-small');
export const ChevronDown = createFlaticonComponent('fi-rr-angle-small-down');
export const LogOut = createFlaticonComponent('fi-rr-sign-out-alt');
export const CloudSun = createFlaticonComponent('fi-rr-cloud-sun');
export const LayoutGrid = createFlaticonComponent('fi-rr-apps');
export const TableList = createFlaticonComponent('fi-rr-table-list');
export const Store = createFlaticonComponent('fi-rr-shop');
export const Boxes = createFlaticonComponent('fi-rr-boxes');

