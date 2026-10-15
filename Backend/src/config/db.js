import mysql from "mysql2/promise";
import { getConfig } from "./env.js";

export function createPool(config = getConfig().db) {
  return mysql.createPool(config);
}
