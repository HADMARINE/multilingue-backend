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
  @SetSuccessMessage('langcode 1.0.0')
  getLangCode(req: WrappedRequest): any {
    return langcode;
  }
}
