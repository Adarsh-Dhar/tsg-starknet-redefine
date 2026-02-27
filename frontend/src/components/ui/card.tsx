import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, children }) => (
  <div className={`rounded-lg border bg-white/5 shadow-md ${className || ''}`}>{children}</div>
);

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => (
  <div className={`px-4 pt-4 ${className || ''}`}>{children}</div>
);

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children }) => (
  <div className={`px-4 pb-4 ${className || ''}`}>{children}</div>
);

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children }) => (
  <h3 className={`font-bold text-lg ${className || ''}`}>{children}</h3>
);
