import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditProjectFormComponent } from './edit-project-form.component';

describe('EditProjectFormComponent', () => {
  let component: EditProjectFormComponent;
  let fixture: ComponentFixture<EditProjectFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProjectFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditProjectFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
