declare module 'xid-js' {
  interface GeneratedXid {
    toString(): string;
  }

  interface XidStatic {
    next(): GeneratedXid;
  }

  const Xid: XidStatic;
  export default Xid;
}


