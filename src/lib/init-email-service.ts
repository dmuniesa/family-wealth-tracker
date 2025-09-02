import { getUnifiedEmailService } from './unified-email-service';

let initialized = false;

export async function initializeEmailService() {
  if (initialized) return;
  
  try {
    const emailService = getUnifiedEmailService();
    await emailService.initialize();
    initialized = true;
    console.log('Email service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    throw error;
  }
}

// Auto-initialize on import in server environments
if (typeof window === 'undefined') {
  initializeEmailService().catch(console.error);
}