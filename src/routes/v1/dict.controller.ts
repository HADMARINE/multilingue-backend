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
  PatchMapping,
} from 'express-quick-builder';
import { AnyVerifier } from 'express-quick-builder/dist/util/DataVerify';
import ErrorDictionary from '@error/ErrorDictionary';
import Dict, { DictInterface } from '@models/Dict';
import { QueryBuilder } from '@util/Assets';
import Word from '@models/Word';
import User from '@models/User';
import { Schema } from 'mongoose';
import langcode from '@src/file/langcode.json';

@Controller
export default class DictController {
  // @GetMapping('/list/lang')
  // @SetSuccessMessage('Got language list')
  // async getLangList(req: WrappedRequest): Promise<string[] | null> {}

  @PostMapping('/voca')
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

    const vocas = await Promise.all(
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

    if (vocas.length === Object.keys(voca).length) {
      return;
    } else {
      throw ErrorDictionary.db.partial('voca', vocas.length);
    }

    // TODO : Check integrity of vocas
  }

  @PatchMapping('/voca')
  @SetMiddleware(UserAuthority)
  @SetSuccessMessage('Updated vocabularies successfully')
  async modifyVocabularies(req: WrappedRequest): Promise<void | null> {
    const { id, words } = req.verify.body({
      id: DataTypes.string(),
      words: DataTypes.array({ valueVerifier: DataTypes.object() }), // requires prop lang, word
    });

    const word = await Word.find(QueryBuilder({ dict: id }));
    if (word.length === 0) {
      return null;
    }

    for (const w of words) {
      const langcode = w?.lang;
      if (!langcode || w?.word) continue;
      for (const _w of word) {
        if (langcode === _w.lang) {
          const modifiedWord = await Word.findOneAndUpdate(
            { _id: _w._id },
            { word: w.word },
          );
        }
      }
    }
    return;
  }

  @DeleteMapping('/voca')
  @SetMiddleware(UserAuthority)
  @SetSuccessMessage('Successfully deleted vocabulary')
  async deleteVocabulary(req: WrappedRequest): Promise<void | null> {
    const { id } = req.verify.body({
      id: DataTypes.string(),
    });
    const word = await Word.deleteMany({ dict: id as any });
    if (word.deletedCount === 0) return null;
    return;
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

    const user = await User.findOne({ _id: userData._id });
    if (!user) throw ErrorDictionary.auth.fail();

    if (word) {
      const dictList = await Dict.find({ user: userData._id });
      const data = await Word.findOne(
        QueryBuilder({ lang, word, dict: { $in: dictList.map((d) => d._id) } }),
      );
      if (!data) {
        return null;
      }

      const foundVocabs = await Word.find({ dict: data.dict });

      const vocabObj: Record<
        string,
        { word: string; description: string | undefined }
      > = {};

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

    const dictList = await Promise.all(
      data.map(async (d) => {
        const foundVocabs = await Word.find({ dict: d._id });

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

        return vocabObj;
      }),
    );

    if (data.length === 0) {
      return null;
    }

    return {
      sort: user.langsort,
      dict: dictList,
    };
  }

  @PostMapping('/duplicate')
  @SetSuccessMessage('Word registered successfully')
  async checkWordDupliaction(req: WrappedRequest): Promise<{
    duplication: boolean;
    ref?: string[];
  }> {
    const { words, userData } = req.verify.body({
      words: DataTypes.object(),
      userData: DataTypes.object(),
    });

    const dictList = (await Dict.find({ user: userData._id })).map(
      (d) => d._id,
    );

    if (!dictList.length) throw ErrorDictionary.db.notfound();

    let dictKeys: Schema.Types.ObjectId[] = [];

    for (const word of Object.values(words)) {
      const foundWord = await Word.findOne({
        word: word,
        dict: { $in: dictList },
      });
      if (foundWord) {
        let isContainedInList: boolean = false;
        for (const k of dictKeys) {
          if (k === foundWord.dict) {
            isContainedInList = true;
            break;
          }
        }
        if (!isContainedInList) {
          dictKeys.push(foundWord.dict);
        }
      }
    }

    if (dictKeys.length !== 0) {
      return {
        duplication: true,
        ref: dictKeys as unknown as string[],
      };
    } else {
      return {
        duplication: false,
      };
    }
  }

  @PostMapping('/register')
  @SetSuccessMessage('Word registered successfully')
  async registerWord(req: WrappedRequest): Promise<null> {
    const { words, userData } = req.verify.body({
      words: DataTypes.object(),
      userData: DataTypes.object(),
    });

    const dict = await Dict.create({ user: userData._id });
    for (const w of Object.entries(words)) {
      if (!w[1].word) {
        throw ErrorDictionary.data.parameterInvalid('word');
      }

      let isLangcodeExist: boolean = false;
      for (const lang of langcode) {
        if (lang.code === w[0]) {
          isLangcodeExist = true;
        }
      }
      if (!isLangcodeExist) {
        throw ErrorDictionary.langcode.notexist(w[0]);
      }
    }

    for (const w of Object.entries(words) /** [lang, word] */) {
      const wordDoc = w[1].description
        ? {
            dict: dict._id,
            lang: w[0],
            word: w[1].word,
          }
        : {
            dict: dict._id,
            lang: w[0],
            word: w[1].word,
            description: w[1].description,
          };
      try {
        await Word.create(wordDoc);
      } catch {
        throw ErrorDictionary.db.create('word');
      }
    }

    return null;
  }

  @PatchMapping('/')
  @SetSuccessMessage('Word modified successfully')
  async modifyWord(req: WrappedRequest): Promise<null> {
    const { id, words } = req.verify.body({
      id: DataTypes.string(),
      words: DataTypes.object(),
    });

    const wordsArr = Object.entries(words);

    let modifiedKeys: string[] = [];
    for (const w of wordsArr) {
      await Word.findOneAndUpdate(
        {
          dict: id as unknown as Schema.Types.ObjectId,
          lang: w[0],
        },
        {
          $set: {
            word: w[1].word,
            description: w[1].description,
          },
        },
        { upsert: true },
      );
      modifiedKeys.push(w[0]);
    }

    const existingWords = (
      await Word.find({
        dict: id as unknown as Schema.Types.ObjectId,
      })
    ).filter((w) => modifiedKeys.indexOf(w.lang) === -1);

    for (const w of existingWords) {
      await Word.findByIdAndDelete(w._id);
    }

    return null;
  }
}
