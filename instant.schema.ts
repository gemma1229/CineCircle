import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    movies: i.entity({
      title: i.string(),
      genre: i.string(),
      posterUrl: i.string().optional(),
      voteCount: i.number(),
      status: i.string(),
      createdAt: i.number(),
      createdByEmail: i.string().optional(),
    }),
    votes: i.entity({
      movieId: i.string(),
      voterEmail: i.string(),
      createdAt: i.number(),
    }),
    comments: i.entity({
      movieId: i.string(),
      text: i.string(),
      createdAt: i.number(),
      authorEmail: i.string().optional(),
    }),
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;

