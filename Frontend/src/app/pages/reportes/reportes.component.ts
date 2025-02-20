import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export default class ReportesComponent {

}
