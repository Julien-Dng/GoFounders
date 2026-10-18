// Placeholder until @angular/fire is installed.
// Will be replaced by: import { Timestamp } from '@angular/fire/firestore'
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}
