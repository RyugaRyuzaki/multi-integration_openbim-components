export class Event<T> {
    /**
     * Add a callback to this event instance.
     * @param handler - the callback to be added to this event.
     */
    add( handler: T extends void ? { (): void } : { ( data: T ): void } ): void {
        this.handlers.push( handler );
    }

    /**
     * Removes a callback from this event instance.
     * @param handler - the callback to be removed from this event.
     */
    remove( handler: T extends void ? { (): void } : { ( data: T ): void } ): void {
        this.handlers = this.handlers.filter( ( h ) => h !== handler );
    }

    /** Triggers all the callbacks assigned to this event. */
    trigger = async ( data?: T ) => {
        const handlers = this.handlers.slice( 0 );
        for ( const handler of handlers ) {
            await handler( data as any );
        }
    };

    /** Gets rid of all the suscribed events. */
    reset() {
        this.handlers.length = 0;
    }

    private handlers: ( T extends void ? { (): void } : { ( data: T ): void } )[] =
        [];
}
export interface Disposable {
    /**
     * Destroys the object from memory to prevent a
     * [memory leak](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects).
     */
    dispose: () => Promise<void>;
}
export interface Updateable {
    /** Actions that should be executed after updating the component. */
    onAfterUpdate: Event<any>;

    /** Actions that should be executed before updating the component. */
    onBeforeUpdate: Event<any>;

    /**
     * Function used to update the state of this component each frame. For
     * instance, a renderer component will make a render each frame.
     */
    update( delta?: number ): void;
}
export interface FragmentIdMap {
    [fragmentID: string]: Set<string>;
}