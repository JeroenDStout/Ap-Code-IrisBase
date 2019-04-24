import * as React from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    DroppableProvided,
    DraggableLocation,
    DropResult,
    DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot
} from 'react-beautiful-dnd';
import { StreamWrangler, ReorderStreamsInstr } from './stream-wrangler';
import * as Fbemit from 'fbemitter';
import './-gen/stream-area.css';

interface Item {
    id: string;
    content: string;
}
interface IAppState {
    items: Item[];
    selected: Item[];
}
interface IMoveResult {
    droppable: Item[];
    droppable2: Item[];
}

/**
 * Moves an item from one list to another list.
 */
const move = (source: Item[], destination: Item[], droppableSource: DraggableLocation, droppableDestination: DraggableLocation): IMoveResult | any => {
    const sourceClone = [...source];
    const destClone = [...destination];
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    const result = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;

    return result;
};

const getItemStyle = (draggableStyle: any, isDragging: boolean): {} => ({
    userSelect: 'none',
    ...draggableStyle
});

const getListStyle = (isDraggingOver: boolean): {} => ({
});

export default class StreamArea extends React.Component<{}, IAppState> {

    public id2List = {
        droppable: 'items',
        droppable2: 'selected'
    };

    constructor(props: any) {
        super(props);

        //this.onDragEnd = this.onDragEnd.bind(this);
        this.getList = this.getList.bind(this);
    }

    public getList(id: string): Item[] {
        return this.state[this.id2List[id]];
    }

    public onDragEnd(result: DropResult): void {

        const { source, destination } = result;

        if (!destination) {
            return;
        }

        if (source.droppableId === destination.droppableId) {
            let instr = new ReorderStreamsInstr();
            instr.Src_Index  = source.index;
            instr.Dest_Index = destination.index;
            StreamWrangler.reorder_streams(instr);
        } else {
            const resultFromMove: IMoveResult = move(
                this.getList(source.droppableId),
                this.getList(destination.droppableId),
                source,
                destination
            );

            this.setState({
                items: resultFromMove.droppable,
                selected: resultFromMove.droppable2
            });
        }
    }

    streamWranglerSubscription: Fbemit.EventSubscription;
    componentDidMount() {
        let self = this;
        this.streamWranglerSubscription = StreamWrangler.Event_Streams_Changed.addListener('any', function () { self.forceUpdate() });
    }

    public render() {
        let streams = StreamWrangler.Streams;
        console.log("Streams")
        console.log(streams)

        //    < div key = { item.UniqueID } > { item.UniqueID }</div >

        function handleClick(e:any) {
            e.preventDefault();
            e.stopPropagation();
            console.log('The link was clicked.');
        }
        function handleMouseDown(e: any) {
            e.preventDefault();
            e.stopPropagation();
            console.log('On mousedown.');
            
        }

        return (
            <div className="stream-space">
                <div className="stream-carrier">
                    <DragDropContext onDragEnd={this.onDragEnd}>
                        <Droppable
                            droppableId="stream-list"
                            type="COLUMN"
                            direction="horizontal"
                            isCombineEnabled={false}
                        >
                            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={getListStyle(snapshot.isDraggingOver)}
                                    className="carrier"
                                >
                                    {streams.map((item, index) => (
                                        <Draggable key={item.UniqueID} draggableId={"drag-stream-" + item.UniqueID} index={index}>
                                            {(providedDraggable: DraggableProvided, snapshotDraggable: DraggableStateSnapshot) => (
                                                <div>
                                                    <div
                                                        ref={providedDraggable.innerRef}
                                                        {...providedDraggable.draggableProps}
                                                        {...providedDraggable.dragHandleProps}
                                                        style={getItemStyle(
                                                            providedDraggable.draggableProps.style,
                                                            snapshotDraggable.isDragging
                                                        )}
                                                        className={"stream-holder"
                                                            + (snapshotDraggable.isDragging ? " dragged" : "")
                                                        }
                                                    >
                                                        <div className="stream" beautiful-dnd-droppable="0">Stream no{item.UniqueID}
                                                            <div onClick={handleClick} onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}>I am clickable</div>
                                                            <button>Do something!</button>
                                                        </div>
                                                    </div>
                                                    {providedDraggable.placeholder}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </div>
            
            //    <Droppable droppableId="droppable">
            //        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
            //            <div
            //                ref={provided.innerRef}
            //                {...provided.droppableProps}
            //                style={getListStyle(snapshot.isDraggingOver)}
            //            >
            //                {this.state.items.map((item, index) => (
            //                    <Draggable key={item.id} draggableId={item.id} index={index}>
            //                        {(providedDraggable: DraggableProvided, snapshotDraggable: DraggableStateSnapshot) => (
            //                            <div>
            //                                <div
            //                                    ref={providedDraggable.innerRef}
            //                                    {...providedDraggable.draggableProps}
            //                                    {...providedDraggable.dragHandleProps}
            //                                    style={getItemStyle(
            //                                        providedDraggable.draggableProps.style,
            //                                        snapshotDraggable.isDragging
            //                                    )}
            //                                >
            //                                    {item.content}
            //                                </div>
            //                                {providedDraggable.placeholder}
            //                            </div>
            //                        )}
            //                    </Draggable>
            //                ))}
            //                {provided.placeholder}
            //            </div>
            //        )}
            //    </Droppable>
            //    <Droppable droppableId="droppable2">
            //        {(providedDroppable2: DroppableProvided, snapshotDroppable2: DroppableStateSnapshot) => (
            //            <div
            //                ref={providedDroppable2.innerRef}
            //                style={getListStyle(snapshotDroppable2.isDraggingOver)}>
            //                {this.state.selected.map((item, index) => (
            //                    <Draggable
            //                        key={item.id}
            //                        draggableId={item.id}
            //                        index={index}>
            //                        {(providedDraggable2: DraggableProvided, snapshotDraggable2: DraggableStateSnapshot) => (
            //                            <div>
            //                                <div
            //                                    ref={providedDraggable2.innerRef}
            //                                    {...providedDraggable2.draggableProps}
            //                                    {...providedDraggable2.dragHandleProps}
            //                                    style={getItemStyle(
            //                                        providedDraggable2.draggableProps.style,
            //                                        snapshotDraggable2.isDragging
            //                                    )}>
            //                                    {item.content}
            //                                </div>
            //                                {providedDraggable2.placeholder}
            //                            </div>
            //                        )}
            //                    </Draggable>
            //                ))}
            //                {providedDroppable2.placeholder}
            //            </div>
            //        )}
            //    </Droppable>

        );
    }

}