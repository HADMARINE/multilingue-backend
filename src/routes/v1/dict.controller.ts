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
import ErrorDictionary from '@error/ErrorDictionary';
import Dict, { DictInterface } from '@models/Dict';
import { QueryBuilder } from '@util/Assets';

@Controller
export default class DictController {
  // @GetMapping('/list/lang')
  // @SetSuccessMessage('Got language list')
  // async getLangList(req: WrappedRequest): Promise<string[] | null> {}

  // @GetMapping('/fetch/all')

  @GetMapping('/fetch')
  @SetSuccessMessage('Fetched lists successfully')
  async fetchData(req: WrappedRequest): Promise<DictInterface[] | null> {
    const { skip, limit, search } = req.verify.query({
      skip: DataTypes.numberNull(),
      limit: DataTypes.numberNull(),
      search: {
        lang: DataTypes.stringNull(),
        word: DataTypes.stringNull(),
      },
    });

    const { lang, word } = search;

    if (!word && !!lang) {
      throw ErrorDictionary.data.parameterNull('word');
    }

    const data = await Dict.find(QueryBuilder({ lang, word }))
      .skip(skip || 0)
      .limit(limit || 10);

    if (data.length === 0) {
      return null;
    }
  }
}
