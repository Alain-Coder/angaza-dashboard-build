declare module '@/scripts/firebase-config' {
  import admin from 'firebase-admin';
  
  export const db: admin.firestore.Firestore | null;
}