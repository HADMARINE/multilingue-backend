import logger from 'clear-logger';
import welcome from '@src/pages/Welcome';
import moment from 'moment';
import {
  AllMapping,
  Controller,
  GetMapping,
  PostMapping,
  ReturnRawData,
  WrappedRequest,
  DataTypes,
  SetSuccessMessage,
} from 'express-quick-builder';
import { AnyVerifier } from 'express-quick-builder/dist/util/DataVerify';

@Controller
export default class DictController {
  @GetMapping('/list/lang')
  @SetSuccessMessage('Got language list')
  async getLangList(req: WrappedRequest): Promise<string[] | null> {}

  @GetMapping('/fetch')
  @SetSuccessMessage('Fetched lists successfully')
  async fetchData(req: WrappedRequest): Promise<void> {
    const { skip, limit, language, word } = req.verify.query({
      skip: DataTypes.numberNull(),
      limit: DataTypes.numberNull(),
      language: DataTypes.stringNull(),
      word: DataTypes.stringNull(),
    });
  }
}
