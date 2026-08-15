import { RouterModule, Routes } from '@angular/router';

import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-reportes',
    imports: [RouterModule],
    templateUrl: './reportes.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./reportes.component.css']
})
export default class ReportesComponent {

}
