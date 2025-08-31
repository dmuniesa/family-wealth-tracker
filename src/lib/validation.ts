import { z } from 'zod';

export const emailSchema = z.string().email('Please enter a valid email address');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const ibanSchema = z.string()
  .min(15, 'IBAN must be at least 15 characters')
  .max(34, 'IBAN must not exceed 34 characters')
  .regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'Please enter a valid IBAN format');

export const optionalIbanSchema = z.string()
  .optional()
  .refine((iban) => {
    if (!iban || iban.trim() === '') return true;
    return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban) && iban.length >= 15 && iban.length <= 34;
  }, 'Please enter a valid IBAN format');

export const currencySchema = z.enum(['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']);

export const amountSchema = z.number()
  .min(0, 'Amount must be positive')
  .max(999999999.99, 'Amount is too large');

export const dateSchema = z.string().refine((date) => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && parsedDate <= new Date();
}, {
  message: 'Please enter a valid date that is not in the future',
});

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

export const validateIBAN = (iban: string): boolean => {
  const sanitized = iban.replace(/\s/g, '').toUpperCase();
  
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(sanitized)) {
    return false;
  }

  const rearranged = sanitized.slice(4) + sanitized.slice(0, 4);
  
  const numericString = rearranged.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString()
  );

  let remainder = 0;
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit)) % 97;
  }

  return remainder === 1;
};