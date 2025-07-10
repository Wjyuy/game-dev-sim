import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  background?: 'white' | 'slate' | 'transparent';
  onClick?: () => void; // 기존
  
  draggable?: boolean; // 드래그 가능한지 여부
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void; // 드래그 시작 시 이벤트 핸들러
  // 추가적으로 onDragEnd, onDragOver, onDrop 등도 필요하면 여기에 추가할 수 있습니다.
  // 다만 현재는 Card가 드래그 '소스'로만 사용되므로 위 두 개만 있어도 충분합니다.
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  shadow = 'sm',
  border = true,
  rounded = 'lg',
  background = 'white',
  onClick,
  draggable,
  onDragStart, 
}) => {
  const baseClasses = 'transition-all duration-200';
  
  const hoverClasses = hover ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer' : '';
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const borderClasses = border ? 'border border-slate-200 dark:border-slate-700' : ''; // dark mode 추가

  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  const backgroundClasses = {
    white: 'bg-white dark:bg-gray-800', // dark mode 추가
    slate: 'bg-slate-50 dark:bg-gray-700', // dark mode 추가
    transparent: 'bg-transparent'
  };

  const combinedClasses = `
    ${baseClasses}
    ${paddingClasses[padding]}
    ${shadowClasses[shadow]}
    ${borderClasses}
    ${roundedClasses[rounded]}
    ${backgroundClasses[background]}
    ${hoverClasses}
    ${className}
  `.trim();

  // onClick이 있다면 button, draggable이 있다면 div (또는 적절한 태그)
  // 여기서는 CardComponent를 동적으로 결정하지 않고,
  // onClick이 있거나 draggable이 있으면 button 태그를 사용하도록 가정합니다.
  // 드래그 가능한 요소를 보통 div로 많이 사용하므로, div로 유지합니다.
  const CardComponent = (onClick || draggable) ? 'div' : 'div'; // 또는 'button'으로 하려면 <button> 태그의 속성을 고려해야 합니다.

  return (
    <CardComponent className={combinedClasses} onClick={onClick} draggable={draggable} onDragStart={onDragStart}>
      {children}
    </CardComponent>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
};

const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  );
};

const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;