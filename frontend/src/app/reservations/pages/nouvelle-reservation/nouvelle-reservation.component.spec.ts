import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NouvelleReservationComponent } from './nouvelle-reservation.component';

describe('NouvelleReservationComponent', () => {
  let component: NouvelleReservationComponent;
  let fixture: ComponentFixture<NouvelleReservationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NouvelleReservationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NouvelleReservationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
