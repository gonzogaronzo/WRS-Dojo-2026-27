import React from 'react';
import LayoutLegacy from './LayoutLegacy';
import { LessonRuntimeProvider } from './lessonRuntimeContext';

type LayoutProps = React.ComponentProps<typeof LayoutLegacy>;

const Layout: React.FC<LayoutProps> = (props) => (
  <LessonRuntimeProvider lesson={props.lesson}>
    <LayoutLegacy {...props} />
  </LessonRuntimeProvider>
);

export default Layout;
