import { postFramework, PostProps } from './helper';
import HeartSimulation from '../../components/HeartSimulation';


function EighthPost({ date }: PostProps): JSX.Element {
    const content = <HeartSimulation />;

    return postFramework("Heart Diagram", content, date);
}


export default EighthPost;
