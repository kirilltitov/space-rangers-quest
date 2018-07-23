import firebase from "firebase";

import { Player } from "../lib/qmplayer/player";
import { GameLog, GameState } from "../lib/qmplayer/funcs";

interface Config {
    player: Player;
    lastPlayedGame: string;
}

interface SavedGames {
    [gameName: string]: GameState | undefined
}

interface WonGames {
    [gameName: string]: GameLog | undefined
}
/*
Here is firebase rules:
{
  "rules": {
    "usersPublic": {
      "$uid": {
        ".write": "$uid === auth.uid",        
      },
      ".read": true,
      ".indexOn": ["gamesWonCount"]
    },
     
    "usersPrivate": {
      "$uid": {
        ".write": "$uid === auth.uid",
        ".read": true,
      }
    }
  }
}
*/
const INDEXEDDB_NAME = "spaceranges";
const INDEXEDDB_CONFIG_STORE_NAME = "config";
const INDEXEDDB_SAVEDGAME_STORE_NAME = "savedgames";
const INDEXESDV_WONGAMES_STORE_NAME = "wongames";

const FIREBASE_USERS_PRIVATE = `usersPrivate`;
const FIREBASE_USERS_PUBLIC = `usersPublic`;



export async function getDb(app: firebase.app.App) {
    console.info("Starting to get db");
    const idb = indexedDB.open(INDEXEDDB_NAME, 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        idb.onerror = e => reject(new Error(idb.error.toString()));
        idb.onsuccess = (e: any) => resolve(e.target.result);
        idb.onupgradeneeded = (e: any) => {
            console.info("onupgradeneeded");
            const db: IDBDatabase = e.target.result;
            // console.info(`Old version=${db.}`)
            if (!db.objectStoreNames.contains(INDEXEDDB_CONFIG_STORE_NAME)) {
                console.info(`Creating config store`);
                db.createObjectStore(INDEXEDDB_CONFIG_STORE_NAME, {
                    // keyPath: false,
                    autoIncrement: false
                });
            } else {
                console.info(`It containt config store`);
            }
        };
    });

    let firebaseUser: firebase.User | null;
    try {
        app.auth().onAuthStateChanged(function(user) {
            firebaseUser = user;
            console.info(`on auth changed = ${firebaseUser}`);
        });
        await new Promise<void>(resolve => {
            const unsubscribe = app.auth().onAuthStateChanged(() => {
                unsubscribe();
                resolve();
            });
        });
    } catch (e) {
        console.error(`Error with firebase: `, e);
    }

    /*
    async function setPrivate(key: keyof Config, value: Config[typeof key]) {
        console.info(`setConfig key=${key} value=${value}`);
        const trx = db.transaction([INDEXEDDB_CONFIG_STORE_NAME], "readwrite");
        const os = trx.objectStore(INDEXEDDB_CONFIG_STORE_NAME);
        const getReq = os.put(value, key);
        await new Promise<void>((resolve, reject) => {
            getReq.onsuccess = e => resolve(getReq.result);
            getReq.onerror = e => reject(new Error(getReq.error.toString()));
        });

        try {
            if (firebaseUser) {
                console.info(`setConfig key=${key} value=${value} saving to firebase`);
                await app
                    .database()
                    .ref(`${FIREBASE_USERS_PRIVATE}/${firebaseUser.uid}/${key}`)
                    .set(value);
            }
        } catch (e) {
            console.error(`Error with firebase: `, e);
        }
    }
    */
    

    /*
    async function getPrivate(key: keyof Config): Promise<Config[typeof key]> {
        const trx = db.transaction([INDEXEDDB_CONFIG_STORE_NAME], "readonly");
        const os = trx.objectStore(INDEXEDDB_CONFIG_STORE_NAME);
        const getReq = os.get(key);
        const localResult = await new Promise<Config[typeof key]>(
            (resolve, reject) => {
                getReq.onsuccess = e => resolve(getReq.result);
                getReq.onerror = e =>
                    reject(new Error(getReq.error.toString()));
            }
        );
        console.info(`getConfig key=${key} localResult=${localResult}`);

        try {
            const firebaseResult = await new Promise<
                Config[typeof key] | undefined
            >(
                resolve =>
                    firebaseUser
                        ? app
                              .database()
                              .ref(
                                  `${FIREBASE_USERS_PRIVATE}/${
                                      firebaseUser.uid
                                  }/${key}`
                              )
                              .once("value", snapshot =>
                                  resolve(snapshot ? snapshot.val() : undefined)
                              )
                        : resolve(undefined)
            );
            if (firebaseResult !== undefined) {
                console.info(`getConfig key=${key} firebaseResult=${localResult}`);
                await setPrivate(key, firebaseResult);
                return firebaseResult;
            }
        } catch (e) {
            console.error(`Error with firebase: `, e);
        }
        console.info(`getConfig key=${key} no firebase result`);
        return localResult;
    }
    */

    function createGetAndSet<T extends Object, U extends keyof T = keyof T>(
        storeName: string) {
            const set = async (key: U, value: T[U]) => {
                console.info(`setConfig store=${storeName} key=${key} value=${value}`);
                const trx = db.transaction([storeName], "readwrite");
                const os = trx.objectStore(storeName);
                const getReq = os.put(value, `${key}`);
                await new Promise<void>((resolve, reject) => {
                    getReq.onsuccess = e => resolve(getReq.result);
                    getReq.onerror = e => reject(new Error(getReq.error.toString()));
                });
        
                try {
                    if (firebaseUser) {
                        console.info(`setConfig store=${storeName} key=${key} value=${value} saving to firebase`);
                        await app
                            .database()
                            .ref(`${FIREBASE_USERS_PRIVATE}/${firebaseUser.uid}/${key}`)
                            .set(value);
                    }
                } catch (e) {
                    console.error(`Error with firebase: `, e);
                }
            };

        const get = async (key: U): Promise<T[typeof key]> =>  {
            const trx = db.transaction([storeName], "readonly");
            const os = trx.objectStore(storeName);
            const getReq = os.get(key);
            const localResult = await new Promise<T[typeof key]>(
                (resolve, reject) => {
                    getReq.onsuccess = e => resolve(getReq.result);
                    getReq.onerror = e =>
                        reject(new Error(getReq.error.toString()));
                }
            );
            console.info(`getConfig store=${storeName} key=${key} localResult=${localResult}`);
    
            try {
                const firebaseResult = await new Promise<
                    T[U]| undefined
                >(
                    resolve =>
                        firebaseUser
                            ? app
                                  .database()
                                  .ref(
                                      `${FIREBASE_USERS_PRIVATE}/${
                                          firebaseUser.uid
                                      }/${key}`
                                  )
                                  .once("value", snapshot =>
                                      resolve(snapshot ? snapshot.val() : undefined)
                                  )
                            : resolve(undefined)
                );
                if (firebaseResult !== undefined) {
                    console.info(`getConfig key=${key} firebaseResult=${localResult}`);
                    await set(key, firebaseResult);
                    return firebaseResult;
                }
            } catch (e) {
                console.error(`Error with firebase: `, e);
            }
            console.info(`getConfig key=${key} no firebase result`);
            return localResult;
        }
        return {get, set}
    }

    function setWonGame(gameName: string, proof: GameLog) {
        // todo
    }
    function removeWonGame(gameName: string) {
        // todo
    }

    function setOwnHighscoresName(name: string) {
        // todo
    }

    function getOwnHighscoresName() {
        // todo
    }

    function getOwnWonGames() {

    }

    function getHighscores() { // Only from firebase!

    }

    const privatevalues = createGetAndSet<Config>(INDEXEDDB_CONFIG_STORE_NAME);

    return {
        getPrivate: privatevalues.get,
        setPrivate: privatevalues.set,
    };
}
