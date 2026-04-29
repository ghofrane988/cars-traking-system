import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulationGpsComponent } from './simulation-gps.component';

describe('SimulationGpsComponent', () => {
  let component: SimulationGpsComponent;
  let fixture: ComponentFixture<SimulationGpsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SimulationGpsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulationGpsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
