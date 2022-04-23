import { model, Schema, Document, models } from 'mongoose';
import error from '@error/ErrorDictionary';

export interface DictInterface {
  user: Schema.Types.ObjectId;
}

const DictSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, reuqired: true, ref: 'User' },
});

export interface DictDocument extends Document, DictInterface {
  // Add Methods here
}

// DictSchema.methods.~~

DictSchema.pre('save', function (next): void {
  const doc = this as DictDocument;
  models.Dict.findOne(
    {
      user: doc.user,
    },
    function (err: Error, site: DictDocument) {
      if (site) next(error.db.exists());
      if (err) next(err);
      next();
    },
  );
});

const Dict = model<DictDocument>('Dict', DictSchema);

export default Dict;
