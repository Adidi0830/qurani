import Xid from "xid-js";

export const generateId = () => Xid.next().toString();
