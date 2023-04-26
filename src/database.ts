import { BaseEntity, Column, Entity, DataSource, PrimaryColumn } from "typeorm";

@Entity()
export class Message extends BaseEntity {
    @PrimaryColumn()
    hash!: string;

    @Column()
    content!: string;

    @Column({ nullable: true })
    parent?: string;

    @Column({ type: "bigint" })
    at!: number;

    @Column()
    replied!: boolean;

    static repo() {
        return AppDataSource.getRepository(this);
    }
}

export const AppDataSource = new DataSource({
    type: "better-sqlite3",
    database: `${__dirname}/../database.db`,
    entities: [Message],
    synchronize: true,
});
