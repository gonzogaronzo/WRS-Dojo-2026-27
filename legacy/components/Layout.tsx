import React from 'react';
import LayoutLegacy from './LayoutLegacy';
import { LessonRuntimeProvider } from './lessonRuntimeContext';

type LayoutProps = React.ComponentProps<typeof LayoutLegacy>;

const Layout: React.FC<LayoutProps> = (props) => (
  <LessonRuntimeProvider lesson={props.lesson}>
    <div className="relative h-full w-full">
      <LayoutLegacy {...props} />
    </div>
  </LessonRuntimeProvider>
);

export default Layout;
