import React from 'react';
import { Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  block?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'gold' | 'cyan';
  className?: string;
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  size = 'medium',
  block = false,
  ghost = false,
  disabled = false,
  variant = 'default',
  className
}) => {
  const buttonClass = classnames(
    styles.button,
    {
      [styles.buttonLarge]: size === 'large',
      [styles.buttonSmall]: size === 'small',
      [styles.buttonBlock]: block,
      [styles.buttonGhost]: ghost,
      [styles.buttonDisabled]: disabled,
      [styles.buttonGold]: variant === 'gold',
      [styles.buttonCyan]: variant === 'cyan'
    },
    className
  );

  return (
    <Button className={buttonClass} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
};

export default GradientButton;
