import { model, Schema, Document, models } from 'mongoose';
import error from '@error/ErrorDictionary';

export interface WordInterface {
  id: Schema.Types.ObjectId;
  lang: string;
  word: string;
  description?: string;
}

const WordSchema: Schema = new Schema({
  id: { type: Schema.Types.ObjectId, reuqired: true, ref: 'Dict' },
  lang: { type: String, required: true },
  word: { type: String, required: true },
  description: { type: String, required: false },
});

export interface WordDocument extends Document, WordInterface {
  // Add Methods here
}

// WordSchema.methods.~~

WordSchema.pre('save', function (next): void {
  const doc = this as WordDocument;
  models.Word.findOne(
    {
      lang: doc.lang,
      word: doc.word,
    },
    function (err: Error, site: WordDocument) {
      if (site) next(error.db.exists());
      if (err) next(err);
      next();
    },
  );
});

const Word = model<WordDocument>('Word', WordSchema);

export default Word;
