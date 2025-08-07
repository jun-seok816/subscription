interface db_keys{
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

type t_db = {
  DB: db_keys;     
  port: number;
};

export default class Db {
  private iv_Data;

  public get pt_Data(): t_db {
    return this.iv_Data;
  }

  constructor() {
    this.iv_Data = {      
      DB: {
        host: "localhost",
        port: 3309,
        user: "root",
        password: "loutbtbahah4281!",
        database: "subscription",        
        charset:"utf8mb4"
      },  
      port: 3000,
    };

  }

}

