interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-forge-surface border border-forge-border rounded-xl p-4
        ${onClick ? "cursor-pointer hover:border-forge-accent transition-colors" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
