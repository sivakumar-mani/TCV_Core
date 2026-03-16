import { Component, signal } from '@angular/core';
import { Header } from '../shared/header/header';
import { Footer } from '../shared/footer/footer';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Sidebar } from '../shared/sidebar/sidebar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [ Header, Footer, MatSidenavModule, Sidebar, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
opened = false;

constructor( private breakPointService : BreakpointObserver){
  // function is using show hide in mobile and web view
  this.breakPointService.observe(['(min-width:768px']).subscribe( results=>{
    this.opened = results.matches
  })
}
}
