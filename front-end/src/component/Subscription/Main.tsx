import React from "react";
import SideBar from "./SideBar";
import SubscriptionManagementPage from "./SubscriptionManagementPage";

export default function Main(){
    return(
        <div style={{"display":"flex"}}>
            <SideBar/>
            <SubscriptionManagementPage/>            
        </div>
    )
}