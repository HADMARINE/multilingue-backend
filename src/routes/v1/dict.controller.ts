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
  SetMiddleware,
} from 'express-quick-builder';
import { AnyVerifier } from 'express-quick-builder/dist/util/DataVerify';
import ErrorDictionary from '@error/ErrorDictionary';
import Dict, { DictInterface } from '@models/Dict';
import { QueryBuilder } from '@util/Assets';
import Word from '@models/Word';
import User from '@models/User';
import { UserAuthority } from '@util/Middleware';

@Controller
export default class DictController {
  // @GetMapping('/list/lang')
  // @SetSuccessMessage('Got language list')
  // async getLangList(req: WrappedRequest): Promise<string[] | null> {}

  @PostMapping('/voca/')
  @SetMiddleware(UserAuthority)
  @SetSuccessMessage('Successfully registered new vocabulary')
  async registerVocab(req: WrappedRequest): Promise<void | null> {
    const { userData, voca } = req.verify.body({
      userData: DataTypes.object(),
      voca: DataTypes.object(),
    });

    for (const v of Object.values(voca)) {
      if (!v.word) throw ErrorDictionary.data.parameterNull('voca > word');
    }

    const user = await User.findOne({ _id: userData._id });
    if (!user) throw ErrorDictionary.auth.fail();

    const dict = await Dict.create({ user: user._id });

    const vocas = Promise.race(
      Object.entries(voca).map(async ([l, v]) => {
        const newWord = await Word.create(
          QueryBuilder({
            lang: l,
            word: v.word,
            description: v.description,
            dict: dict._id,
          }),
        );
        return newWord;
      }),
    );

    // TODO : Check integrity of vocas
  }

  // Check this endpoint to improve about multi tasking
  @GetMapping('/voca/fetch')
  @SetMiddleware(UserAuthority)
  @SetSuccessMessage('Fetched lists successfully')
  async fetchVocabularies(req: WrappedRequest): Promise<{
    sort: string[];
    dict: Record<string, { word: string; description?: string }>[];
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

      const vocabObj: Record<string, { word: string; description?: string }> =
        {};

      for (const word of foundVocabs) {
        if (word.description) {
          vocabObj[word.lang] = {
            word: word.word,
            description: word.description,
          };
        } else {
          vocabObj[word.lang] = {
            word: word.word,
          };
        }
      }

      return {
        sort: user.langsort,
        dict: [vocabObj],
      };
    }

    const data = await Dict.find({ user: userData._id })
      .skip(skip || 0)
      .limit(limit || 10);

    if (data.length === 0) {
      return null;
    }

    const dictList = await Promise.all(
      data.map(async (d) => {
        const words = await Word.find({ dict: d._id });
        const wordMap: Record<string, { word: string; description?: string }> =
          {};

        for (const w of words) {
          if (w.description) {
            wordMap[w.lang] = {
              word: w.word,
              description: w.description,
            };
          } else {
            wordMap[w.lang] = {
              word: w.word,
            };
          }
        }

        return wordMap;
      }),
    );

    const user = await User.findOne({ _id: userData._id });
    if (!user) throw ErrorDictionary.auth.fail();

    return {
      sort: user.langsort,
      dict: dictList,
    };
  }
}
