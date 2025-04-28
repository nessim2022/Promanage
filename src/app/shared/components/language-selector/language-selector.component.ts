import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { OverlayPanelModule } from 'primeng/overlaypanel';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule, OverlayPanelModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss']
})
export class LanguageSelectorComponent implements OnInit {
  languages: Language[] = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇹🇳' }
  ];
  
  currentLanguage: Language = this.languages[0];
  languageMenuItems: MenuItem[] = [];

  constructor() { }

  ngOnInit(): void {
    this.setupLanguageMenu();
  }

  private setupLanguageMenu(): void {
    this.languageMenuItems = this.languages.map(lang => ({
      label: `${lang.flag} ${lang.name}`,
      command: () => {
        this.changeLanguage(lang.code);
      }
    }));
  }

  changeLanguage(languageCode: string): void {
    const language = this.languages.find(lang => lang.code === languageCode);
    if (language) {
      this.currentLanguage = language;
      // Ici vous implémenteriez le code pour changer la langue dans votre application
    }
  }
} 