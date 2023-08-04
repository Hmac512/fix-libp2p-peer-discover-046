import {
    MultiaddrConnection,
  } from "@libp2p/interface-connection";
  import {
    ConnectionGater,
  } from "@libp2p/interface-connection-gater";
  import { PeerId } from "@libp2p/interface-peer-id";
  import { Multiaddr } from "@multiformats/multiaddr";




  /**
   * ConnectionFilter ensures that nodes only collect to peers in a specific allowlist.
   *
   * It implements the entire libp2p ConnectionGater interface to intercept calls at the lowest level
   * and prevent the connection.
   *
   * Note: arrow functions are used since libp2p's createLibp2p uses a "recursivePartial" on the
   * passed in object and class methods are not enumerated. Using arrow functions allows their
   * recursivePartial enumerator to parse the object (see `./gossipNode.ts`)
   */
  export class ConnectionFilter implements ConnectionGater {
    private allowedPeers: string[] | undefined;

    constructor(addrs: string[] | undefined) {
      this.allowedPeers = addrs;
    }

    updateAllowedPeers(addrs: string[]) {
      this.allowedPeers = addrs;
    }

    denyDialPeer = async (peerId: PeerId): Promise<boolean> => {
      const deny = this.shouldDeny(peerId.toString());
      if (deny) {
        console.log({ peerId, filter: "denyDialPeer" }, "denied a connection");
      }
      return deny;
    };

    denyDialMultiaddr = async (
      _multiaddr: Multiaddr
    ): Promise<boolean> => {
        const peerId = _multiaddr.getPeerId()!.toString()
      const deny = this.shouldDeny(peerId.toString());
      if (deny) {
        console.log({ peerId, filter: "denyDialMultiaddr" }, "denied a connection");
      }
      return deny;
    };

    denyInboundConnection = async (
      _maConn: MultiaddrConnection
    ): Promise<boolean> => {
      /** PeerId may not be known yet, let it pass and other filters will catch it. */
      return false;
    };

    denyOutboundConnection = async (
      peerId: PeerId,
      _maConn: MultiaddrConnection
    ): Promise<boolean> => {
      const deny = this.shouldDeny(peerId.toString());
      if (deny) {
        console.log(
          { peerId, filter: "denyOutboundConnection" },
          "denied a connection"
        );
      }
      return deny;
    };

    denyInboundEncryptedConnection = async (
      peerId: PeerId,
      _maConn: MultiaddrConnection
    ): Promise<boolean> => {
      const deny = this.shouldDeny(peerId.toString());
      if (deny) {
        console.log(
          { peerId, filter: "denyInboundEncryptedConnection" },
          "denied a connection"
        );
      }
      return deny;
    };

    denyOutboundEncryptedConnection = async (
      peerId: PeerId,
      _maConn: MultiaddrConnection
    ): Promise<boolean> => {
      const deny = this.shouldDeny(peerId.toString());
      if (deny) {
        console.log(
          { peerId, filter: "denyOutboundEncryptedConnection" },
          "denied a connection"
        );
      }
      return deny;
    };

    denyInboundUpgradedConnection = async (
      peerId: PeerId,
      _maConn: MultiaddrConnection
    ): Promise<boolean> => {
      const deny = this.shouldDeny(peerId.toString());
      if (deny) {
        console.log(
          { peerId, filter: "denyInboundUpgradedConnection" },
          "denied a connection"
        );
      }
      return deny;
    };

    denyOutboundUpgradedConnection = async (
      peerId: PeerId,
      _maConn: MultiaddrConnection
    ): Promise<boolean> => {
      const deny = this.shouldDeny(peerId.toString());
      if (deny) {
        console.log(
          { peerId, filter: "denyOutboundUpgradedConnection" },
          "denied a connection"
        );
      }
      return deny;
    };

    filterMultiaddrForPeer = async (peer: PeerId): Promise<boolean> => {
      return !this.shouldDeny(peer.toString());
    };

    /* -------------------------------------------------------------------------- */
    /*                               Private Methods                              */
    /* -------------------------------------------------------------------------- */

    private shouldDeny(peerId: string) {
      return false

    }
  }
