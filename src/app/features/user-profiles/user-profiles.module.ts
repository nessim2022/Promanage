import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfilesComponent } from './user-profiles.component';

@NgModule({
  declarations: [UserProfilesComponent],
  imports: [CommonModule],
  exports: [UserProfilesComponent]
})
export class UserProfilesModule {} 