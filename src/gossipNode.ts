import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { tcp } from "@libp2p/tcp";
import { createLibp2p, Libp2p } from "libp2p";
import { MultiaddrConnection } from "@libp2p/interface-connection";
import { ConnectionGater } from "@libp2p/interface-connection-gater";
import { PeerId } from "@libp2p/interface-peer-id";
import { Multiaddr } from "@multiformats/multiaddr";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import { Message as GossipSubMessage } from "@libp2p/interface-pubsub";
import { msgId } from "@libp2p/pubsub/utils";

/* This has been imported from the libp2p-gossipsub implementation as it's not public there */
export const msgIdFnStrictSign = (message: GossipSubMessage): Uint8Array => {
  if (message.type !== "signed") {
    throw new Error("expected signed message type");
  }
  // Should never happen
  if (message.sequenceNumber == null) throw Error("missing seqno field");

  return msgId(message.from.toBytes(), message.sequenceNumber);
};

function text2Binary(string_: string) {
  const a = new TextEncoder();
  return a.encode(string_);
}

const MultiaddrLocalHost = "/ip4/127.0.0.1";
const peerDiscoveryTopic = `_farcaster.0.peer_discovery`;

function getMessageId(message: GossipSubMessage): Uint8Array {
  return msgIdFnStrictSign(message);
}

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

  denyDialMultiaddr = async (_multiaddr: Multiaddr): Promise<boolean> => {
    const peerId = _multiaddr.getPeerId()!.toString();
    const deny = this.shouldDeny(peerId.toString());
    if (deny) {
      console.log(
        { peerId, filter: "denyDialMultiaddr" },
        "denied a connection"
      );
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
    return false;
  }
}

const listenMultiAddrStr = `${MultiaddrLocalHost}/tcp/${0}`;
const createNode = async () => {
  const gossip = gossipsub({
    emitSelf: false,
    allowPublishToZeroPeers: true,
    globalSignaturePolicy: "StrictSign",
    msgIdFn: getMessageId,
    directPeers: [],
    canRelayMessage: true,
    scoreThresholds: {},
  });

  const libP2PNode = await createLibp2p({
    addresses: {
      listen: [listenMultiAddrStr],
      announce: [],
    },
    connectionGater: new ConnectionFilter([]),
    transports: [tcp()],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    services: {
      pubsub: gossip,
    },
    //@ts-ignore
    peerDiscovery: [pubsubPeerDiscovery({ topics: [peerDiscoveryTopic] })],
  });

  return libP2PNode;
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}

const main = async () => {
  const NUM_NODES = 10;
  const PROPAGATION_DELAY = 3 * 1000; // between 2 and 3 full heartbeat ticks
  const nodes: Libp2p[] = [];
  for (const vs of [...Array(NUM_NODES)]) {
    const node = await createNode();
    await node.start();
    nodes.push(node);
  }

  for (const node of nodes) {
    //@ts-ignore
    // node.services["pubsub"]!.addEventListener("gossipsub:message", (event) => {
    //   console.log("gossipsub:message", {
    //     identity: node.peerId.toString(),
    //     event,
    //   });
    // });
    // node?.addEventListener("peer:discovery", (event) => {
    //   console.log("peer:discovery", event.detail.id);
    // });
  }

  try {
    const mainNode = nodes[0]!;
    for (const n of nodes.slice(1)) {
      // sleep to stay under the rate limit of 5 connections per second
      await sleep(200);
      for (const multiAddr of mainNode.getMultiaddrs()) {
        const result = await n.dial(multiAddr);
        assert(result.status === "open", "Connection not open");
      }
    }

    const primaryTopic = `f_network_${0}_primary`;
    // Subscribe each node to the test topic

    for (const node of nodes) {
      //@ts-ignore
      await node.services["pubsub"]?.subscribe(primaryTopic);
    }

    await sleep(PROPAGATION_DELAY);

    nodes.map((n) => console.log(n.getPeers()));
    nodes.map((n) => {
      //@ts-ignore
      //console.log("Connection length", n.services["pubsub"]?.getPeers().length);
      //@ts-ignore
      assert(n.services["pubsub"]?.getPeers().length > 0, "Mesh did not form");
    });
    console.log("Mesh created");

    const randomNode = nodes[NUM_NODES - 3]!;
    //@ts-ignore
    const publishResult = await randomNode.services["pubsub"]!.publish(
      primaryTopic,
      text2Binary("test")
    );

    console.log(publishResult);

    let i = 1;
    for (const vs of [...Array(10)]) {
      console.log("Round", i);
      console.log("\n");
      await sleep(3000);
      nodes.map((n) => {
        console.log("\n");
        console.log(
          `Node ${n.peerId.toString()} has ${n.getPeers().length} peers`
        );
        console.log("\tThe peers are:\n");

        n.getPeers().forEach((peer) => {
          console.log(`\t\t ${peer.toString()}`);
        });

        assert(
          //@ts-ignore
          n.services["pubsub"]?.getPeers().length > 0,
          "Mesh did not form"
        );
        console.log("\n");
      });
      console.log("\n");
      i++;
    }
  } catch (err) {
    console.error(err);
    nodes.forEach((node) => node.stop());
    console.error("FAILED");
    return;
  }

  nodes.forEach((node) => node.stop());
};

main().then(() => {
  console.log("finished");
});
