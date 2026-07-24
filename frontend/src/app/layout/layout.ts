import { Component, OnDestroy, OnInit } from '@angular/core';
import { Header } from '../shared/header/header';
import { Footer } from '../shared/footer/footer';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Sidebar } from '../shared/sidebar/sidebar';
import { RouterOutlet } from '@angular/router';
import { IdleLogoutService } from '../services/idle-logout.service';

@Component({
  selector: 'app-layout',
  imports: [ Header, Footer, MatSidenavModule, Sidebar, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit, OnDestroy {
opened = false;
collapsed = false;
isDesktop = false;

constructor(
  private breakPointService: BreakpointObserver,
  private idleLogoutService: IdleLogoutService
){
  // function is using show hide in mobile and web view
  this.breakPointService.observe(['(min-width:768px)']).subscribe( results=>{
    this.isDesktop = results.matches;
    this.opened = results.matches;
    if (!results.matches) {
      this.collapsed = false;
    }
  })
}

ngOnInit() {
  this.idleLogoutService.start();
}

ngOnDestroy() {
  this.idleLogoutService.stop();
}

toggleSidebar(sidenav: any) {
  if (this.isDesktop) {
    this.collapsed = !this.collapsed;
    return;
  }

  sidenav.toggle();
}

expandSidebar() {
  if (this.isDesktop) this.collapsed = false;
}
}
