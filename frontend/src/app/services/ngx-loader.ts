import { NgModule } from "@angular/core";
import { NgxUiLoaderModule, NgxUiLoaderConfig ,SPINNER, PB_DIRECTION} from 'ngx-ui-loader';

const ngxUiLoaderConfig: NgxUiLoaderConfig={
 text:"loading...",
    textColor:"#ffffff",
    textPosition:"center-center",
    pbColor:"red",
    bgsColor:"red",
    fgsColor:"red",
    fgsType: SPINNER.ballSpinClockwise,
    fgsSize:100,
    pbDirection: PB_DIRECTION.leftToRight,
    pbThickness:5
}

@NgModule({
  imports: [
    NgxUiLoaderModule.forRoot(ngxUiLoaderConfig)
  ],
  exports: [NgxUiLoaderModule]
})
export class NgxUiLoaderConfigModule {}