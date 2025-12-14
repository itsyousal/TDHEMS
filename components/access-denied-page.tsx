/**
 * Server component wrapper for AccessDenied
 * For use in server components and async page renders
 * 
 * This simply re-exports AccessDenied as it's already a valid client component
 * that can be used in server components via 'use client' directive
 */

export { AccessDenied as AccessDeniedPage } from './access-denied';
