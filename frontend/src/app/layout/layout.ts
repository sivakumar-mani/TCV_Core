import { Component, OnDestroy, OnInit } from '@angular/core';
import { Header } from '../shared/header/header';
import { Footer } from '../shared/footer/footer';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Sidebar } from '../shared/sidebar/sidebar';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { IdleLogoutService } from '../services/idle-logout.service';
import { filter, Subscription } from 'rxjs';

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
private navigationSubscription?: Subscription;

constructor(
  private breakPointService: BreakpointObserver,
  private idleLogoutService: IdleLogoutService,
  private router: Router
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
  this.navigationSubscription = this.router.events
    .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
    .subscribe(() => {
      if (!this.isDesktop) this.opened = false;
    });
}

ngOnDestroy() {
  this.navigationSubscription?.unsubscribe();
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
