import * as Fbemit from 'fbemitter';

class BaseWidget {

}

class Stream {
    UniqueID: number;

    Pinned_Widgets = new Array<BaseWidget>();
    Stream_Widgets = new Array<BaseWidget>();

    Event_Widgets_Changed:  Fbemit.EventEmitter = new Fbemit.EventEmitter();
    Event_Messages_Changed: Fbemit.EventEmitter = new Fbemit.EventEmitter();
}

export class ReorderStreamsInstr {
    Src_Index:  number;
    Dest_Index: number;
}

export class StreamWrangler {
    static Streams = new Array<Stream>();

    static Event_Streams_Changed: Fbemit.EventEmitter = new Fbemit.EventEmitter();

    static reorder = (list: Array<Stream>, startIndex: number, endIndex: number): Array<Stream> => {
        const result = [...list];
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    static commence(): void {
        console.log("StreamWrangler commencing");

        let nStream = new Stream();
        nStream.UniqueID = 1;

        this.Streams.push(nStream);

        nStream = new Stream();
        nStream.UniqueID = 2;

        this.Streams.push(nStream);

        nStream = new Stream();
        nStream.UniqueID = 3;

        this.Streams.push(nStream);

        nStream = new Stream();
        nStream.UniqueID = 4;

        this.Streams.push(nStream);

        this.Event_Streams_Changed.emit("new_streams");
        this.Event_Streams_Changed.emit("any");
    }

    static reorder_streams(instr: ReorderStreamsInstr): void {
        this.Streams = this.reorder(
            this.Streams,
            instr.Src_Index,
            instr.Dest_Index
        );
        
        this.Event_Streams_Changed.emit("reordered");
        this.Event_Streams_Changed.emit("any");
    }
}