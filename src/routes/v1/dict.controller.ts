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
import Word from '@models/Word';
import User from '@models/User';

@Controller
export default class DictController {
  // @GetMapping('/list/lang')
  // @SetSuccessMessage('Got language list')
  // async getLangList(req: WrappedRequest): Promise<string[] | null> {}

  @GetMapping('/fetch')
  @SetSuccessMessage('Fetched lists successfully')
  async fetchData(req: WrappedRequest): Promise<{
    sort: string[];
    dict: Record<string, { word: string; description: string | undefined }>[];
  } | null> {
    const { skip, limit, search } = req.verify.query({
      skip: DataTypes.numberNull(),
      limit: DataTypes.numberNull(),
      search: {
        lang: DataTypes.stringNull(),
        word: DataTypes.stringNull(),
      },
    });

    const { lang, word } = search;

    const { userData } = req.verify.body({
      userData: DataTypes.object(),
    });

    if (!word && !!lang) {
      throw ErrorDictionary.data.parameterNull('word');
    }

    if (word) {
      const dictList = await Dict.find({ user: userData._id });
      const data = await Word.findOne(
        QueryBuilder({ lang, word, dict: { $in: dictList.map((d) => d._id) } }),
      );
      if (!data) {
        return null;
      }

      const foundVocabs = await Word.find({ dict: data.dict });

      const user = await User.findOne({ _id: userData._id });

      if (!user) throw ErrorDictionary.auth.fail();

      const vocabObj: Record<
        string,
        { word: string; description: string | undefined }
      > = {};

      for (const word of foundVocabs) {
        vocabObj[word.lang] = {
          word: word.word,
          description: word.description,
        };
      }

      return {
        sort: user.langsort,
        dict: [vocabObj],
      };
    }

    const data = await Dict.find({ user: userData._id })
      .skip(skip || 0)
      .limit(limit || 10);

    const dictList = data.map(async (d) => {
      const words = await Word.find({ dict: d._id });
    });

    if (data.length === 0) {
      return null;
    }
  }
}
