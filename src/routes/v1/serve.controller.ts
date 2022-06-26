import langcode from '@src/file/langcode.json';
import {
  Controller,
  GetMapping,
  SetSuccessMessage,
  WrappedRequest,
} from 'express-quick-builder';

@Controller
export default class ServeController {
  @GetMapping('/langcode')
  @SetSuccessMessage('langcode')
  getLangCode(req: WrappedRequest): any {
    return langcode;
  }
  @GetMapping('/langcode/v')
  getLangCodeVer(): any {
    return langcode.version;
  }
}
